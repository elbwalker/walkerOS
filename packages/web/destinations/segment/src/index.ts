import type { WalkerOS } from '@walkeros/core';
import {
  getMappingValue,
  isArray,
  isObject,
  isString,
  isThenable,
  StepError,
} from '@walkeros/core';
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
 * Call sdk.load() with destructured Segment settings. The write key and the
 * CDN host go into the first argument, the settings Analytics.js reads
 * there; the rest are its init options.
 */
function loadAnalytics(sdk: SegmentSDK, settings: Settings): SegmentAnalytics {
  const {
    apiKey,
    cdnURL,
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

  return sdk.load(
    { writeKey: apiKey, ...(cdnURL !== undefined ? { cdnURL } : {}) },
    options,
  );
}

function isSegmentAnalytics(value: unknown): value is SegmentAnalytics {
  return (
    isObject(value) &&
    ['track', 'identify', 'group', 'page', 'reset', 'setAnonymousId'].every(
      (key) => typeof value[key] === 'function',
    )
  );
}

/** Waits for one Analytics.js call; a throw or a rejection becomes a StepError. */
async function send(fn: () => unknown): Promise<void> {
  try {
    await fn();
  } catch (error) {
    throw new StepError('Segment call failed', {
      code: 'transport',
      cause: error,
    });
  }
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
  settings: Partial<Settings>,
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
 * when the resolved value differs from the last-fired identity. Returns
 * whether it called the SDK.
 */
async function applyIdentify(
  analytics: SegmentAnalytics,
  resolved: Record<string, unknown>,
  state: RuntimeState,
  options?: SegmentEventOptions,
): Promise<boolean> {
  const last = state.lastIdentity || {};
  const userId = isString(resolved.userId) ? resolved.userId : undefined;
  const anonymousId = isString(resolved.anonymousId)
    ? resolved.anonymousId
    : undefined;
  const traits =
    isObject(resolved.traits) && !isArray(resolved.traits)
      ? resolved.traits
      : undefined;

  let called = false;
  if (anonymousId && anonymousId !== last.anonymousId) {
    await send(() => analytics.setAnonymousId(anonymousId));
    called = true;
  }

  const traitsHash = hashTraits(traits);
  const userIdChanged = userId !== last.userId;
  const traitsChanged = traitsHash !== (last.traitsHash ?? '');
  const hasChange = userIdChanged || (traits !== undefined && traitsChanged);

  if (!hasChange && !anonymousId) return called;

  await send(() =>
    options
      ? analytics.identify(userId, traits || {}, options)
      : analytics.identify(userId, traits || {}),
  );

  state.lastIdentity = {
    userId,
    anonymousId: anonymousId ?? last.anonymousId,
    traitsHash,
  };
  return true;
}

/** Resolve and apply the group mapping; returns whether it called the SDK. */
async function applyGroup(
  analytics: SegmentAnalytics,
  resolved: Record<string, unknown>,
  state: RuntimeState,
  options?: SegmentEventOptions,
): Promise<boolean> {
  const groupId = isString(resolved.groupId) ? resolved.groupId : undefined;
  if (!groupId) return false;

  const traits =
    isObject(resolved.traits) && !isArray(resolved.traits)
      ? resolved.traits
      : undefined;

  const last = state.lastGroup || {};
  const traitsHash = hashTraits(traits);
  const groupIdChanged = groupId !== last.groupId;
  const traitsChanged = traitsHash !== (last.traitsHash ?? '');
  if (!groupIdChanged && !traitsChanged) return false;

  await send(() =>
    options
      ? analytics.group(groupId, traits || {}, options)
      : analytics.group(groupId, traits || {}),
  );

  state.lastGroup = { groupId, traitsHash };
  return true;
}

/** Resolve and apply the page mapping; returns whether it called the SDK. */
async function applyPage(
  analytics: SegmentAnalytics,
  pageMapping: unknown,
  event: WalkerOS.Event,
  collector: unknown,
  options?: SegmentEventOptions,
): Promise<boolean> {
  // Boolean true → call page() with no args (SDK auto-collect).
  if (pageMapping === true) {
    await send(() =>
      options
        ? analytics.page(undefined, undefined, undefined, options)
        : analytics.page(),
    );
    return true;
  }

  const resolved = await getMappingValue(
    event,
    pageMapping as Parameters<typeof getMappingValue>[1],
    { collector } as Parameters<typeof getMappingValue>[2],
  );
  if (!isObject(resolved)) return false;

  const category = isString(resolved.category) ? resolved.category : undefined;
  const name = isString(resolved.name) ? resolved.name : undefined;
  const properties =
    isObject(resolved.properties) && !isArray(resolved.properties)
      ? resolved.properties
      : undefined;

  await send(() => {
    if (options)
      return analytics.page(
        category ?? null,
        name ?? null,
        properties ?? {},
        options,
      );
    if (properties !== undefined)
      return analytics.page(category ?? null, name ?? null, properties);
    if (name !== undefined || category !== undefined)
      return analytics.page(category ?? null, name ?? null);
    return analytics.page();
  });
  return true;
}

export const destinationSegment: Destination = {
  type: 'segment',

  config: {},

  // Analytics.js loads in init, so it starts with the page. A consent-gated
  // destination is initialized only once its consent is granted.
  async init({ config, env }) {
    const apiKey = config.settings?.apiKey;
    if (!apiKey)
      throw new StepError('Segment needs settings.apiKey', { code: 'config' });
    const settings: Settings = { ...config.settings, apiKey };

    const _state: RuntimeState = { lastIdentity: {}, lastGroup: {} };
    let loaded: unknown;
    try {
      loaded = loadAnalytics(getSegment(env), settings);
      // load() answers the instance at once; a wrapped SDK may answer it
      // through a promise.
      if (!isSegmentAnalytics(loaded) && isThenable(loaded))
        loaded = await loaded;
    } catch (error) {
      throw new StepError('Segment load() failed', {
        code: 'vendor-not-ready',
        cause: error,
      });
    }
    if (!isSegmentAnalytics(loaded))
      throw new StepError('Segment load() returned no Analytics instance', {
        code: 'vendor-not-ready',
      });

    // The instance is also the promise of its load, settled once
    // Analytics.js is ready: a failed load fails the later pushes.
    if (isThenable(loaded))
      Promise.resolve(loaded).then(
        () => undefined,
        () => {
          _state.failed = true;
        },
      );
    _state.analytics = loaded;

    return { ...config, settings: { ...settings, _state } };
  },

  async push(event, { config, rule, data, collector }) {
    const settings: Partial<Settings> = config.settings || {};
    const state: RuntimeState = settings._state || {};
    const analytics = state.analytics;
    if (state.failed)
      throw new StepError('Segment Analytics.js failed to load', {
        code: 'vendor-not-loaded',
      });
    if (!analytics)
      throw new StepError('Segment not ready: init did not load Analytics.js', {
        code: 'not-ready',
      });

    const mappingSettings = rule?.settings || {};
    const options = buildEventOptions(event, settings);
    let calls = 0;

    // 1. Reset fires first so subsequent identity calls start clean.
    if (mappingSettings.reset !== undefined) {
      const resolved =
        typeof mappingSettings.reset === 'boolean'
          ? mappingSettings.reset
          : await getMappingValue(event, mappingSettings.reset, { collector });
      if (resolved) {
        await send(() => analytics.reset());
        calls++;
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
      if (
        isObject(resolved) &&
        (await applyIdentify(analytics, resolved, state, options))
      )
        calls++;
    }

    // 3. Group - rule-level override wins over destination-level.
    const groupMapping = mappingSettings.group ?? settings.group;
    if (groupMapping !== undefined) {
      const resolved = await getMappingValue(event, groupMapping, {
        collector,
      });
      if (
        isObject(resolved) &&
        (await applyGroup(analytics, resolved, state, options))
      )
        calls++;
    }

    // 4. Page (explicit first-class Segment pattern)
    if (
      mappingSettings.page !== undefined &&
      (await applyPage(
        analytics,
        mappingSettings.page,
        event,
        collector,
        options,
      ))
    )
      calls++;

    // 5. Default track call unless rule opts out via silent.
    if (rule?.silent !== true) {
      const eventName = isString(rule?.name) ? rule.name : event.name;
      const properties = isObject(data) ? data : {};

      await send(() =>
        options
          ? analytics.track(eventName, properties, options)
          : analytics.track(eventName, properties),
      );
      calls++;
    }

    settings._state = state;

    // A silent rule whose own settings resolved nothing sent nothing.
    const ruleSettings =
      mappingSettings.reset !== undefined ||
      mappingSettings.identify !== undefined ||
      mappingSettings.group !== undefined ||
      mappingSettings.page !== undefined;
    if (!calls && ruleSettings)
      throw new StepError(
        `Segment: the silent rule of "${event.name}" resolved no identity, group or page`,
        { code: 'missing-input' },
      );
  },
};

export default destinationSegment;
