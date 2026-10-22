import type { Logger, WalkerOS } from '@walkeros/core';
import {
  getGrantedConsent,
  getMappingValue,
  isArray,
  isBoolean,
  isObject,
  isString,
  StepError,
  stepCall,
} from '@walkeros/core';
import mixpanel from 'mixpanel-browser';
import type {
  Destination,
  Env,
  MixpanelSDK,
  RuntimeState,
  Settings,
} from './types';

// Types export - consumers can import as DestinationMixpanel.Settings etc.
export * as DestinationMixpanel from './types';

/**
 * Resolve the Mixpanel SDK: use the caller-provided mock when available
 * (tests), otherwise fall back to the real mixpanel-browser singleton.
 * Matches @walkeros/web-destination-clarity and
 * @walkeros/server-destination-gcp (BigQuery).
 */
function getMixpanel(env: Env | undefined): MixpanelSDK {
  return env?.mixpanel ?? (mixpanel as unknown as MixpanelSDK);
}

/**
 * Resolve the distinctId from an identify mapping value and call
 * mixpanel.identify() only if the value changed since the last call.
 * Returns the updated lastIdentity snapshot.
 */
async function applyIdentify(
  mp: MixpanelSDK,
  resolved: Record<string, unknown>,
  lastIdentity: RuntimeState['lastIdentity'] = {},
): Promise<NonNullable<RuntimeState['lastIdentity']>> {
  const updated = { ...lastIdentity };
  const distinctId = resolved.distinctId;
  if (!isString(distinctId) || distinctId === '') return updated;
  if (distinctId === lastIdentity.distinctId) return updated;
  await stepCall(
    () => mp.identify(distinctId),
    'transport',
    'Mixpanel identify failed',
  );
  updated.distinctId = distinctId;
  return updated;
}

type PeopleObjectOp =
  | 'set'
  | 'set_once'
  | 'increment'
  | 'append'
  | 'union'
  | 'remove';

const PEOPLE_OBJECT_OPS: PeopleObjectOp[] = [
  'set',
  'set_once',
  'increment',
  'append',
  'union',
  'remove',
];

/**
 * Dispatch resolved people operations to the SDK. The resolved object
 * may contain any subset of the 8 ops.
 */
async function applyPeople(
  mp: MixpanelSDK,
  resolved: Record<string, unknown>,
): Promise<boolean> {
  let applied = false;
  for (const op of PEOPLE_OBJECT_OPS) {
    const bag = resolved[op];
    if (!isObject(bag)) continue;
    if (Object.keys(bag).length === 0) continue;
    // Typed dispatch - each op's first arg is a Record<string, unknown>.
    await stepCall(
      () =>
        (mp.people[op] as (props: Record<string, unknown>) => void)(
          bag as Record<string, unknown>,
        ),
      'transport',
      `Mixpanel people.${op} failed`,
    );
    applied = true;
  }

  if (isArray(resolved.unset)) {
    const names = (resolved.unset as unknown[]).filter((v): v is string =>
      isString(v),
    );
    if (names.length > 0)
      await stepCall(
        () => mp.people.unset(names),
        'transport',
        'Mixpanel people.unset failed',
      );
    applied = names.length > 0 || applied;
  }

  if (resolved.delete_user === true) {
    await stepCall(
      () => mp.people.delete_user(),
      'transport',
      'Mixpanel people.delete_user failed',
    );
    applied = true;
  }

  return applied;
}

type GroupObjectOp = 'set' | 'set_once' | 'union' | 'remove';

const GROUP_OBJECT_OPS: GroupObjectOp[] = [
  'set',
  'set_once',
  'union',
  'remove',
];

async function applyGroupProfile(
  mp: MixpanelSDK,
  resolved: Record<string, unknown>,
): Promise<boolean> {
  const { key, id } = resolved as { key?: unknown; id?: unknown };
  if (!isString(key) || key === '' || !isString(id) || id === '') return false;
  let applied = false;

  const group = mp.get_group(key, id);

  for (const op of GROUP_OBJECT_OPS) {
    const bag = resolved[op];
    if (!isObject(bag)) continue;
    if (Object.keys(bag).length === 0) continue;
    await stepCall(
      () =>
        (group[op] as (props: Record<string, unknown>) => void)(
          bag as Record<string, unknown>,
        ),
      'transport',
      `Mixpanel group.${op} failed`,
    );
    applied = true;
  }

  if (isArray(resolved.unset)) {
    const names = (resolved.unset as unknown[]).filter((v): v is string =>
      isString(v),
    );
    if (names.length > 0)
      await stepCall(
        () => group.unset(names),
        'transport',
        'Mixpanel group.unset failed',
      );
    applied = names.length > 0 || applied;
  }

  if (resolved.delete === true) {
    await stepCall(
      () => group.delete(),
      'transport',
      'Mixpanel group.delete failed',
    );
    applied = true;
  }

  return applied;
}

function isStringArray(value: unknown): value is string[] {
  return isArray(value) && value.every(isString);
}

/**
 * A configured mapping that resolved to nothing skips its call: a declared
 * skip, said once at DEBUG with the event and the mapping key, never the
 * value, so a wrong mapping path does not look like an event without data.
 */
function skipped(
  logger: Logger.Instance,
  event: WalkerOS.Event,
  call: string,
  key: string,
): void {
  logger.debug(`Mixpanel skipped ${call}: ${key} resolved to nothing`, {
    event: event.name,
  });
}

export const destinationMixpanel: Destination = {
  type: 'mixpanel',

  config: {},

  async init({ config, env }) {
    // A copy, so the destructure below does not read keys off the live settings
    const settings = { ...config.settings };
    if (!settings.apiKey)
      throw new StepError('Mixpanel needs settings.apiKey', { code: 'config' });

    const mp = getMixpanel(env as Env | undefined);
    // Destructure the walkerOS-specific keys out; the rest flow through to
    // Mixpanel's Config.
    const {
      apiKey,
      identify: _identify,
      group: _group,
      _state: _existingState,
      ...mixpanelConfig
    } = settings;

    // Apply walkerOS-specific defaults: walkerOS sources handle page views
    // and element captures, so we turn off Mixpanel's built-ins unless the
    // user explicitly enables them.
    const initConfig = {
      track_pageview: false,
      autocapture: false,
      ...mixpanelConfig,
    };

    // Mixpanel's init() is synchronous (returns void).
    await stepCall(
      () => mp.init(apiKey, initConfig),
      'vendor-not-ready',
      'Mixpanel init failed',
    );

    // Initialize runtime state. push() mutates this in place on subsequent
    // events to skip redundant identify() calls.
    const _state: RuntimeState = { lastIdentity: {} };
    return { ...config, settings: { ...settings, _state } };
  },

  async push(event, { config, rule, env, data, collector, logger }) {
    const mp = getMixpanel(env as Env | undefined);
    const settings = (config.settings || {}) as Settings;
    const mappingSettings = rule?.settings || {};
    const state: RuntimeState = settings._state || {};

    // 1. Reset - fires first so subsequent identity calls start clean.
    if (mappingSettings.reset !== undefined) {
      const resolved = isBoolean(mappingSettings.reset)
        ? mappingSettings.reset
        : await getMappingValue(event, mappingSettings.reset, { collector });
      if (resolved) {
        await stepCall(() => mp.reset(), 'transport', 'Mixpanel reset failed');
        state.lastIdentity = {};
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
        isString(resolved.distinctId) &&
        resolved.distinctId !== ''
      )
        state.lastIdentity = await applyIdentify(
          mp,
          resolved,
          state.lastIdentity,
        );
      else skipped(logger, event, 'identify', 'identify');
    }

    // 3. People operations - fires zero or more mp.people.* calls.
    if (mappingSettings.people !== undefined) {
      const resolved = await getMappingValue(event, mappingSettings.people, {
        collector,
      });
      if (!(isObject(resolved) && (await applyPeople(mp, resolved))))
        skipped(logger, event, 'people', 'people');
    }

    // 4. Group assignment - resolves to { key, id } and calls set_group.
    const groupMapping = mappingSettings.group ?? settings.group;
    if (groupMapping !== undefined) {
      const resolved = await getMappingValue(event, groupMapping, {
        collector,
      });
      const { key, id } = isObject(resolved) ? resolved : {};
      if (
        isString(key) &&
        key !== '' &&
        (isString(id) || isStringArray(id)) &&
        id !== ''
      )
        await stepCall(
          () => mp.set_group(key, id),
          'transport',
          'Mixpanel set_group failed',
        );
      else skipped(logger, event, 'set_group', 'group');
    }

    // 5. Group profile - resolves to { key, id, set?, set_once?, ... }
    if (mappingSettings.groupProfile !== undefined) {
      const resolved = await getMappingValue(
        event,
        mappingSettings.groupProfile,
        { collector },
      );
      if (!(isObject(resolved) && (await applyGroupProfile(mp, resolved))))
        skipped(logger, event, 'groupProfile', 'groupProfile');
    }

    // 6. Default track - unless the rule opts out via silent.
    if (rule?.silent !== true) {
      const eventName = isString(rule?.name) ? rule.name : event.name;
      const properties = isObject(data)
        ? (data as Record<string, unknown>)
        : {};
      await stepCall(
        () => mp.track(eventName, properties),
        'transport',
        'Mixpanel track failed',
      );
    }

    // A silent rule whose mappings resolve nothing sends nothing: a declared
    // skip, not a failure. Persist state mutations back onto config.settings.
    settings._state = state;
  },

  // The destination's required consent decides on the whole consent state,
  // as it gates the pushes, and only a change that names a required key
  // reaches Mixpanel: a revocation opts out, a grant opts back in.
  async on(type, { config, data, env, collector }) {
    const required = config.consent;
    if (type !== 'consent' || !required || !isObject(data)) return;
    if (!Object.keys(required).some((key) => key in data)) return;

    const mp = getMixpanel(env as Env | undefined);
    const granted = getGrantedConsent(required, collector.consent) !== false;
    await stepCall(
      () => (granted ? mp.opt_in_tracking() : mp.opt_out_tracking()),
      'consent-not-applied',
      'Mixpanel did not take the consent update',
    );
  },

  destroy({ config, env }) {
    const mp = getMixpanel(env as Env | undefined);
    // Mixpanel has no public flush API. stop_batch_senders() halts the
    // in-memory batcher; any already-queued events rely on the SDK's
    // internal unload handler (sendBeacon on page hide).
    mp.stop_batch_senders?.();
    const settings = config?.settings;
    if (settings?._state) settings._state = { lastIdentity: {} };
  },
};

export default destinationMixpanel;
