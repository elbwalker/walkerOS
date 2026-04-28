import type { WalkerOS } from '@walkeros/core';
import { getMappingValue, isArray, isObject, isString } from '@walkeros/core';
import { AnalyticsBrowser } from '@segment/analytics-next';
import type {
  Destination,
  Env,
  RuntimeState,
  SegmentAnalytics,
  SegmentEventOptions,
  SegmentSDK,
  Settings,
} from './types';

// Types export
export * as DestinationSegment from './types';

/**
 * Real-SDK adapter - wraps AnalyticsBrowser's static load() in our
 * SegmentSDK shape so `env?.analytics ?? realSegment` works.
 *
 * Task 1 confirmed AnalyticsBrowser.load(settings, options) returns an
 * AnalyticsBrowser instance that exposes track/identify/group/page/...
 * The returned instance buffers method calls pre-load and replays them
 * once the internal load promise resolves.
 */
const realSegment: SegmentSDK = {
  load: (settings, options) =>
    AnalyticsBrowser.load(settings, options) as unknown as SegmentAnalytics,
};

function getSegment(env: Env | undefined): SegmentSDK {
  return env?.analytics ?? realSegment;
}

/**
 * Call sdk.load() with destructured Segment settings. Strips walkerOS-
 * specific keys from the options arg passed to the real SDK.
 */
function loadAnalytics(sdk: SegmentSDK, settings: Settings): SegmentAnalytics {
  const {
    apiKey,
    identify: _identify,
    group: _group,
    consent: _consent,
    _state: _existingState,
    ...initOptions
  } = settings;

  // Apply walkerOS defaults that differ from Segment defaults.
  const options = {
    initialPageview: false,
    ...initOptions,
  };

  return sdk.load({ writeKey: apiKey }, options);
}

/**
 * Resolve the live analytics instance, loading on demand if deferred.
 * Returns undefined if load() was deferred and consent hasn't fired yet.
 */
function resolveAnalytics(
  sdk: SegmentSDK,
  settings: Settings,
  state: RuntimeState,
): SegmentAnalytics | undefined {
  if (state.analytics) return state.analytics;
  if (state.loaded) return undefined;
  state.analytics = loadAnalytics(sdk, settings);
  state.loaded = true;
  return state.analytics;
}

/**
 * Stable hash of a traits object for state-diffing. Uses a deterministic
 * JSON stringify - key order matters but is consistent within a session
 * because object literal keys come in insertion order.
 */
function hashTraits(traits: Record<string, unknown> | undefined): string {
  if (!traits) return '';
  try {
    return JSON.stringify(traits);
  } catch {
    return '';
  }
}

/**
 * Build the Segment event options object with consent context from the
 * current walker consent state. Returns undefined unless the user has
 * explicitly opted in by configuring `settings.consent` - this keeps the
 * consent forwarding feature off-by-default so events stay clean.
 *
 * `settings.consent` maps walkerOS consent keys → Segment category names.
 * Only walker keys present in the mapping are forwarded.
 */
function buildEventOptions(
  event: WalkerOS.Event,
  settings: Settings,
): SegmentEventOptions | undefined {
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

  return {
    context: {
      consent: {
        categoryPreferences,
      },
    },
  };
}

/**
 * Resolve and apply identity mapping. Calls analytics.identify() only
 * when the resolved value differs from the last-fired identity.
 */
function applyIdentify(
  analytics: SegmentAnalytics,
  resolved: Record<string, unknown>,
  state: RuntimeState,
  options?: SegmentEventOptions,
): void {
  const last = state.lastIdentity || {};
  const userId = isString(resolved.userId) ? resolved.userId : undefined;
  const anonymousId = isString(resolved.anonymousId)
    ? resolved.anonymousId
    : undefined;
  const traits =
    isObject(resolved.traits) && !isArray(resolved.traits)
      ? (resolved.traits as Record<string, unknown>)
      : undefined;

  if (anonymousId && anonymousId !== last.anonymousId) {
    analytics.setAnonymousId(anonymousId);
  }

  const traitsHash = hashTraits(traits);
  const userIdChanged = userId !== last.userId;
  const traitsChanged = traitsHash !== (last.traitsHash ?? '');
  const hasChange = userIdChanged || (traits !== undefined && traitsChanged);

  if (!hasChange && !anonymousId) return;

  if (options) {
    analytics.identify(userId, traits || {}, options);
  } else {
    analytics.identify(userId, traits || {});
  }

  state.lastIdentity = {
    userId,
    anonymousId: anonymousId ?? last.anonymousId,
    traitsHash,
  };
}

function applyGroup(
  analytics: SegmentAnalytics,
  resolved: Record<string, unknown>,
  state: RuntimeState,
  options?: SegmentEventOptions,
): void {
  const groupId = isString(resolved.groupId) ? resolved.groupId : undefined;
  if (!groupId) return;

  const traits =
    isObject(resolved.traits) && !isArray(resolved.traits)
      ? (resolved.traits as Record<string, unknown>)
      : undefined;

  const last = state.lastGroup || {};
  const traitsHash = hashTraits(traits);
  const groupIdChanged = groupId !== last.groupId;
  const traitsChanged = traitsHash !== (last.traitsHash ?? '');
  if (!groupIdChanged && !traitsChanged) return;

  if (options) {
    analytics.group(groupId, traits || {}, options);
  } else {
    analytics.group(groupId, traits || {});
  }

  state.lastGroup = { groupId, traitsHash };
}

async function applyPage(
  analytics: SegmentAnalytics,
  pageMapping: unknown,
  event: WalkerOS.Event,
  collector: unknown,
  options?: SegmentEventOptions,
): Promise<void> {
  // Boolean true → call page() with no args (SDK auto-collect).
  if (pageMapping === true) {
    if (options) {
      analytics.page(undefined, undefined, undefined, options);
    } else {
      analytics.page();
    }
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
  const category = isString(r.category) ? r.category : undefined;
  const name = isString(r.name) ? r.name : undefined;
  const properties =
    isObject(r.properties) && !isArray(r.properties)
      ? (r.properties as Record<string, unknown>)
      : undefined;

  if (options) {
    analytics.page(category ?? null, name ?? null, properties ?? {}, options);
  } else if (properties !== undefined) {
    analytics.page(category ?? null, name ?? null, properties);
  } else if (name !== undefined || category !== undefined) {
    analytics.page(category ?? null, name ?? null);
  } else {
    analytics.page();
  }
}

export const destinationSegment: Destination = {
  type: 'segment',

  config: {},

  init({ config, env }) {
    if (!config.settings?.apiKey) return false;
    const settings = config.settings as Settings;

    const sdk = getSegment(env as Env | undefined);
    const _state: RuntimeState = {
      lastIdentity: {},
      lastGroup: {},
      loaded: false,
    };

    // If config.consent is declared, defer load() until on('consent').
    // Otherwise load immediately.
    const requiresConsent =
      !!config.consent && Object.keys(config.consent).length > 0;

    if (!requiresConsent) {
      _state.analytics = loadAnalytics(sdk, settings);
      _state.loaded = true;
    }

    return { ...config, settings: { ...settings, _state } };
  },

  async push(event, { config, rule, env, data, collector }) {
    const sdk = getSegment(env as Env | undefined);
    const settings = (config.settings || {}) as Settings;
    const state: RuntimeState = settings._state || {};
    const analytics = resolveAnalytics(sdk, settings, state);
    if (!analytics) return;

    const mappingSettings = rule?.settings || {};
    const options = buildEventOptions(event, settings);

    // 1. Reset fires first so subsequent identity calls start clean.
    if (mappingSettings.reset !== undefined) {
      const resolved =
        typeof mappingSettings.reset === 'boolean'
          ? mappingSettings.reset
          : await getMappingValue(event, mappingSettings.reset, { collector });
      if (resolved) {
        analytics.reset();
        state.lastIdentity = {};
        state.lastGroup = {};
      }
    }

    // 2. Identity - rule-level override wins over destination-level.
    const identifyMapping = mappingSettings.identify ?? settings.identify;
    if (identifyMapping !== undefined) {
      const resolved = await getMappingValue(event, identifyMapping, {
        collector,
      });
      if (isObject(resolved)) {
        applyIdentify(
          analytics,
          resolved as Record<string, unknown>,
          state,
          options,
        );
      }
    }

    // 3. Group - rule-level override wins over destination-level.
    const groupMapping = mappingSettings.group ?? settings.group;
    if (groupMapping !== undefined) {
      const resolved = await getMappingValue(event, groupMapping, {
        collector,
      });
      if (isObject(resolved)) {
        applyGroup(
          analytics,
          resolved as Record<string, unknown>,
          state,
          options,
        );
      }
    }

    // 4. Page (explicit first-class Segment pattern)
    if (mappingSettings.page !== undefined) {
      await applyPage(
        analytics,
        mappingSettings.page,
        event,
        collector,
        options,
      );
    }

    // 5. Default track call unless rule opts out via silent.
    if (rule?.silent !== true) {
      const eventName = isString(rule?.name) ? rule.name : event.name;
      const properties = isObject(data)
        ? (data as Record<string, unknown>)
        : {};

      if (options) {
        analytics.track(eventName, properties, options);
      } else {
        analytics.track(eventName, properties);
      }
    }

    settings._state = state;
  },

  on(type, context) {
    if (type !== 'consent' || !context.data) return;

    const consent = context.data as WalkerOS.Consent;
    const required = context.config?.consent;
    if (!required || Object.keys(required).length === 0) return;

    const settings = (context.config?.settings || {}) as Settings;
    const state: RuntimeState = settings._state || {};
    const sdk = getSegment(context.env as Env | undefined);

    const allGranted = Object.keys(required).every(
      (key) => consent[key] === true,
    );

    if (allGranted && !state.loaded) {
      state.analytics = loadAnalytics(sdk, settings);
      state.loaded = true;
      settings._state = state;
    }
    // If not all granted, walkerOS's config.consent gate blocks subsequent
    // push() calls - no SDK action needed (Segment has no opt-out method).
  },
};

export default destinationSegment;
