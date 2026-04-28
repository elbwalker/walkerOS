import type { WalkerOS } from '@walkeros/core';
import type {
  PushFn,
  Settings,
  RuntimeState,
  RudderStackAnalyticsMock,
} from './types';
import { getMappingValue, isObject, isString, isArray } from '@walkeros/core';

export const push: PushFn = async function (
  event,
  { config, rule, data, collector, env, logger },
) {
  const settings = config.settings as Settings;
  const analytics = settings._analytics as unknown as
    | RudderStackAnalyticsMock
    | undefined;
  const envAnalytics = (
    env as { analytics?: RudderStackAnalyticsMock } | undefined
  )?.analytics;
  const sdk = envAnalytics || analytics;

  if (!sdk) {
    logger.warn('RudderStack Analytics not initialized');
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
    logger.warn('RudderStack requires userId or anonymousId; skipping event', {
      event: event.name,
    });
    return;
  }

  // Build identity object for every SDK call
  const identity: Record<string, unknown> = {};
  if (userId) identity.userId = userId;
  if (anonymousId) identity.anonymousId = anonymousId;

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
    );
  }

  // 6. Alias
  if (mappingSettings.alias !== undefined) {
    await applyAlias(
      sdk,
      mappingSettings.alias,
      event,
      identity,
      collector,
      timestamp,
    );
  }

  // 7. Track (unless silent: true)
  if (rule?.silent !== true) {
    const eventName = isString(rule?.name) ? rule.name : event.name;
    const properties = isObject(data) ? (data as Record<string, unknown>) : {};

    sdk.track({
      ...identity,
      event: eventName,
      properties,
      timestamp,
    });
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

function applyIdentify(
  sdk: RudderStackAnalyticsMock,
  resolved: Record<string, unknown>,
  identity: Record<string, unknown>,
  state: RuntimeState,
  timestamp: Date,
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

  sdk.identify(params);

  state.lastIdentity = {
    userId: identifyUserId,
    anonymousId: identity.anonymousId as string | undefined,
    traitsHash,
  };
}

function applyGroup(
  sdk: RudderStackAnalyticsMock,
  resolved: Record<string, unknown>,
  identity: Record<string, unknown>,
  state: RuntimeState,
  timestamp: Date,
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

  sdk.group(params);

  state.lastGroup = { groupId, traitsHash };
}

async function applyPage(
  sdk: RudderStackAnalyticsMock,
  pageMapping: unknown,
  event: WalkerOS.Event,
  identity: Record<string, unknown>,
  collector: unknown,
  timestamp: Date,
): Promise<void> {
  const params: Record<string, unknown> = { ...identity, timestamp };

  if (pageMapping === true) {
    // Minimal page call -- RudderStack requires name, use empty string
    params.name = '';
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
    name?: unknown;
    properties?: unknown;
  };
  // RudderStack requires name -- fall back to empty string
  params.name = isString(r.name) ? r.name : '';
  if (isObject(r.properties) && !isArray(r.properties)) {
    params.properties = r.properties;
  }

  sdk.page(params);
}

async function applyScreen(
  sdk: RudderStackAnalyticsMock,
  screenMapping: unknown,
  event: WalkerOS.Event,
  identity: Record<string, unknown>,
  collector: unknown,
  timestamp: Date,
): Promise<void> {
  const params: Record<string, unknown> = { ...identity, timestamp };

  if (screenMapping === true) {
    // Minimal screen call -- RudderStack requires name, use empty string
    params.name = '';
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
    name?: unknown;
    properties?: unknown;
  };
  // RudderStack requires name -- fall back to empty string
  params.name = isString(r.name) ? r.name : '';
  if (isObject(r.properties) && !isArray(r.properties)) {
    params.properties = r.properties;
  }

  sdk.screen(params);
}

async function applyAlias(
  sdk: RudderStackAnalyticsMock,
  aliasMapping: unknown,
  event: WalkerOS.Event,
  identity: Record<string, unknown>,
  collector: unknown,
  timestamp: Date,
): Promise<void> {
  const resolved = await getMappingValue(
    event,
    aliasMapping as Parameters<typeof getMappingValue>[1],
    { collector } as Parameters<typeof getMappingValue>[2],
  );
  if (!isObject(resolved)) return;

  const r = resolved as { previousId?: unknown };
  const previousId = isString(r.previousId) ? r.previousId : undefined;
  if (!previousId) return;

  const params: Record<string, unknown> = {
    previousId,
    timestamp,
  };
  // Alias uses userId (the new canonical ID) -- not full identity spread
  if (identity.userId) params.userId = identity.userId;

  sdk.alias(params);
}
