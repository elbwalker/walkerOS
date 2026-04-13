import type { WalkerOS } from '@walkeros/core';
import type {
  PushFn,
  Settings,
  RuntimeState,
  SegmentAnalyticsMock,
} from './types';
import { getMappingValue, isObject, isString, isArray } from '@walkeros/core';

export const push: PushFn = async function (
  event,
  { config, rule, data, collector, env, logger },
) {
  const settings = config.settings as Settings;
  const analytics = settings._analytics as unknown as
    | SegmentAnalyticsMock
    | undefined;
  const envAnalytics = (env as { analytics?: SegmentAnalyticsMock } | undefined)
    ?.analytics;
  const sdk = envAnalytics || analytics;

  if (!sdk) {
    logger.warn('Segment Analytics not initialized');
    return;
  }

  const state: RuntimeState = settings._state || {};
  const mappingSettings = rule?.settings || {};
  const timestamp = new Date(event.timestamp || Date.now());

  // 1. Resolve identity from event
  const userId = settings.userId
    ? resolveString(
        await getMappingValue(event, settings.userId, { collector }),
      )
    : undefined;
  const anonymousId = settings.anonymousId
    ? resolveString(
        await getMappingValue(event, settings.anonymousId, { collector }),
      )
    : undefined;

  if (!userId && !anonymousId) {
    logger.warn('Segment requires userId or anonymousId; skipping event', {
      event: event.name,
    });
    return;
  }

  // Build identity object for every SDK call
  const identity: Record<string, unknown> = {};
  if (userId) identity.userId = userId;
  if (anonymousId) identity.anonymousId = anonymousId;

  // Build consent context
  const context = buildConsentContext(event, settings);

  // 2. Identify -- rule-level overrides destination-level
  const identifyMapping = mappingSettings.identify ?? settings.identify;
  if (identifyMapping !== undefined) {
    const resolved = await getMappingValue(event, identifyMapping, {
      collector,
    });
    if (isObject(resolved)) {
      applyIdentify(
        sdk,
        resolved as Record<string, unknown>,
        identity,
        state,
        timestamp,
        context,
      );
    }
  }

  // 3. Group -- rule-level overrides destination-level
  const groupMapping = mappingSettings.group ?? settings.group;
  if (groupMapping !== undefined) {
    const resolved = await getMappingValue(event, groupMapping, { collector });
    if (isObject(resolved)) {
      applyGroup(
        sdk,
        resolved as Record<string, unknown>,
        identity,
        state,
        timestamp,
        context,
      );
    }
  }

  // 4. Page
  if (mappingSettings.page !== undefined) {
    await applyPage(
      sdk,
      mappingSettings.page,
      event,
      identity,
      collector,
      timestamp,
      context,
    );
  }

  // 5. Screen
  if (mappingSettings.screen !== undefined) {
    await applyScreen(
      sdk,
      mappingSettings.screen,
      event,
      identity,
      collector,
      timestamp,
      context,
    );
  }

  // 6. Track (unless skip: true)
  if (rule?.skip !== true) {
    const eventName = isString(rule?.name) ? rule.name : event.name;
    const properties = isObject(data) ? (data as Record<string, unknown>) : {};

    const params: Record<string, unknown> = {
      ...identity,
      event: eventName,
      properties,
      timestamp,
    };
    if (context) params.context = context;

    sdk.track(params);
  }

  settings._state = state;
};

function resolveString(value: unknown): string | undefined {
  if (isString(value) && value.length > 0) return value;
  return undefined;
}

function hashTraits(traits: Record<string, unknown> | undefined): string {
  if (!traits) return '';
  try {
    return JSON.stringify(traits);
  } catch {
    return '';
  }
}

function buildConsentContext(
  event: WalkerOS.Event,
  settings: Settings,
): Record<string, unknown> | undefined {
  const map = settings.consent;
  if (!map || Object.keys(map).length === 0) return undefined;

  const consentState = event.consent;
  if (!isObject(consentState)) return undefined;

  const categoryPreferences: Record<string, boolean> = {};
  for (const [walkerKey, segmentKey] of Object.entries(map)) {
    if (walkerKey in consentState) {
      categoryPreferences[segmentKey] = consentState[walkerKey] === true;
    }
  }

  if (Object.keys(categoryPreferences).length === 0) return undefined;

  return { consent: { categoryPreferences } };
}

function applyIdentify(
  sdk: SegmentAnalyticsMock,
  resolved: Record<string, unknown>,
  identity: Record<string, unknown>,
  state: RuntimeState,
  timestamp: Date,
  context?: Record<string, unknown>,
): void {
  const last = state.lastIdentity || {};

  // Per-event identify can override userId
  const identifyUserId = isString(resolved.userId)
    ? resolved.userId
    : (identity.userId as string | undefined);
  const traits =
    isObject(resolved.traits) && !isArray(resolved.traits)
      ? (resolved.traits as Record<string, unknown>)
      : undefined;

  const traitsHash = hashTraits(traits);
  const userIdChanged = identifyUserId !== last.userId;
  const traitsChanged = traitsHash !== (last.traitsHash ?? '');

  if (!userIdChanged && !traitsChanged) return;

  const params: Record<string, unknown> = {
    ...identity,
    timestamp,
  };
  if (identifyUserId) params.userId = identifyUserId;
  if (traits) params.traits = traits;
  if (context) params.context = context;

  sdk.identify(params);

  state.lastIdentity = {
    userId: identifyUserId,
    anonymousId: identity.anonymousId as string | undefined,
    traitsHash,
  };
}

function applyGroup(
  sdk: SegmentAnalyticsMock,
  resolved: Record<string, unknown>,
  identity: Record<string, unknown>,
  state: RuntimeState,
  timestamp: Date,
  context?: Record<string, unknown>,
): void {
  const groupId = isString(resolved.groupId) ? resolved.groupId : undefined;
  if (!groupId) return;

  const last = state.lastGroup || {};
  const traits =
    isObject(resolved.traits) && !isArray(resolved.traits)
      ? (resolved.traits as Record<string, unknown>)
      : undefined;

  const traitsHash = hashTraits(traits);
  const groupIdChanged = groupId !== last.groupId;
  const traitsChanged = traitsHash !== (last.traitsHash ?? '');
  if (!groupIdChanged && !traitsChanged) return;

  const params: Record<string, unknown> = {
    ...identity,
    groupId,
    timestamp,
  };
  if (traits) params.traits = traits;
  if (context) params.context = context;

  sdk.group(params);

  state.lastGroup = { groupId, traitsHash };
}

async function applyPage(
  sdk: SegmentAnalyticsMock,
  pageMapping: unknown,
  event: WalkerOS.Event,
  identity: Record<string, unknown>,
  collector: unknown,
  timestamp: Date,
  context?: Record<string, unknown>,
): Promise<void> {
  const params: Record<string, unknown> = { ...identity, timestamp };

  if (pageMapping === true) {
    if (context) params.context = context;
    sdk.page(params);
    return;
  }

  const resolved = await getMappingValue(
    event,
    pageMapping as Parameters<typeof getMappingValue>[1],
    { collector } as Parameters<typeof getMappingValue>[2],
  );
  if (!isObject(resolved)) return;

  const r = resolved as {
    category?: unknown;
    name?: unknown;
    properties?: unknown;
  };
  if (isString(r.category)) params.category = r.category;
  if (isString(r.name)) params.name = r.name;
  if (isObject(r.properties) && !isArray(r.properties)) {
    params.properties = r.properties;
  }
  if (context) params.context = context;

  sdk.page(params);
}

async function applyScreen(
  sdk: SegmentAnalyticsMock,
  screenMapping: unknown,
  event: WalkerOS.Event,
  identity: Record<string, unknown>,
  collector: unknown,
  timestamp: Date,
  context?: Record<string, unknown>,
): Promise<void> {
  const params: Record<string, unknown> = { ...identity, timestamp };

  if (screenMapping === true) {
    if (context) params.context = context;
    sdk.screen(params);
    return;
  }

  const resolved = await getMappingValue(
    event,
    screenMapping as Parameters<typeof getMappingValue>[1],
    { collector } as Parameters<typeof getMappingValue>[2],
  );
  if (!isObject(resolved)) return;

  const r = resolved as {
    category?: unknown;
    name?: unknown;
    properties?: unknown;
  };
  if (isString(r.category)) params.category = r.category;
  if (isString(r.name)) params.name = r.name;
  if (isObject(r.properties) && !isArray(r.properties)) {
    params.properties = r.properties;
  }
  if (context) params.context = context;

  sdk.screen(params);
}
