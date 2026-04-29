import type { WalkerOS } from '@walkeros/core';
import {
  getMappingValue,
  isArray,
  isBoolean,
  isObject,
  isString,
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
function applyIdentify(
  mp: MixpanelSDK,
  resolved: Record<string, unknown>,
  lastIdentity: RuntimeState['lastIdentity'] = {},
): NonNullable<RuntimeState['lastIdentity']> {
  const updated = { ...lastIdentity };
  const distinctId = resolved.distinctId;
  if (!isString(distinctId) || distinctId === '') return updated;
  if (distinctId === lastIdentity.distinctId) return updated;
  mp.identify(distinctId);
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
function applyPeople(mp: MixpanelSDK, resolved: Record<string, unknown>): void {
  for (const op of PEOPLE_OBJECT_OPS) {
    const bag = resolved[op];
    if (!isObject(bag)) continue;
    if (Object.keys(bag).length === 0) continue;
    // Typed dispatch - each op's first arg is a Record<string, unknown>.
    (mp.people[op] as (props: Record<string, unknown>) => void)(
      bag as Record<string, unknown>,
    );
  }

  if (isArray(resolved.unset)) {
    const names = (resolved.unset as unknown[]).filter((v): v is string =>
      isString(v),
    );
    if (names.length > 0) mp.people.unset(names);
  }

  if (resolved.delete_user === true) {
    mp.people.delete_user();
  }
}

type GroupObjectOp = 'set' | 'set_once' | 'union' | 'remove';

const GROUP_OBJECT_OPS: GroupObjectOp[] = [
  'set',
  'set_once',
  'union',
  'remove',
];

function applyGroupProfile(
  mp: MixpanelSDK,
  resolved: Record<string, unknown>,
): void {
  const { key, id } = resolved as { key?: unknown; id?: unknown };
  if (!isString(key) || key === '' || !isString(id) || id === '') return;

  const group = mp.get_group(key, id);

  for (const op of GROUP_OBJECT_OPS) {
    const bag = resolved[op];
    if (!isObject(bag)) continue;
    if (Object.keys(bag).length === 0) continue;
    (group[op] as (props: Record<string, unknown>) => void)(
      bag as Record<string, unknown>,
    );
  }

  if (isArray(resolved.unset)) {
    const names = (resolved.unset as unknown[]).filter((v): v is string =>
      isString(v),
    );
    if (names.length > 0) group.unset(names);
  }

  if (resolved.delete === true) {
    group.delete();
  }
}

export const destinationMixpanel: Destination = {
  type: 'mixpanel',

  config: {},

  init({ config, env }) {
    const settings = config.settings;
    if (!settings?.apiKey) return false;

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
    mp.init(apiKey, initConfig);

    // Initialize runtime state. push() mutates this in place on subsequent
    // events to skip redundant identify() calls.
    const _state: RuntimeState = { lastIdentity: {} };
    return { ...config, settings: { ...settings, _state } };
  },

  async push(event, { config, rule, env, data, collector }) {
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
        mp.reset();
        state.lastIdentity = {};
      }
    }

    // 2. Identity - rule-level override wins over destination-level.
    const identifyMapping = mappingSettings.identify ?? settings.identify;
    if (identifyMapping !== undefined) {
      const resolved = await getMappingValue(event, identifyMapping, {
        collector,
      });
      if (isObject(resolved)) {
        state.lastIdentity = applyIdentify(
          mp,
          resolved as Record<string, unknown>,
          state.lastIdentity,
        );
      }
    }

    // 3. People operations - fires zero or more mp.people.* calls.
    if (mappingSettings.people !== undefined) {
      const resolved = await getMappingValue(event, mappingSettings.people, {
        collector,
      });
      if (isObject(resolved)) {
        applyPeople(mp, resolved as Record<string, unknown>);
      }
    }

    // 4. Group assignment - resolves to { key, id } and calls set_group.
    const groupMapping = mappingSettings.group ?? settings.group;
    if (groupMapping !== undefined) {
      const resolved = await getMappingValue(event, groupMapping, {
        collector,
      });
      if (isObject(resolved)) {
        const { key, id } = resolved as { key?: unknown; id?: unknown };
        if (
          isString(key) &&
          key !== '' &&
          (isString(id) || isArray(id)) &&
          id !== ''
        ) {
          mp.set_group(key, id as string | string[]);
        }
      }
    }

    // 5. Group profile - resolves to { key, id, set?, set_once?, ... }
    if (mappingSettings.groupProfile !== undefined) {
      const resolved = await getMappingValue(
        event,
        mappingSettings.groupProfile,
        { collector },
      );
      if (isObject(resolved)) {
        applyGroupProfile(mp, resolved as Record<string, unknown>);
      }
    }

    // 6. Default track - unless the rule opts out via silent.
    if (rule?.silent !== true) {
      const eventName = isString(rule?.name) ? rule.name : event.name;
      const properties = isObject(data)
        ? (data as Record<string, unknown>)
        : {};
      mp.track(eventName, properties);
    }

    // Persist state mutations back onto config.settings.
    settings._state = state;
  },

  on(type, context) {
    if (type !== 'consent' || !context.data) return;
    const mp = getMixpanel(context.env as Env | undefined);

    const consent = context.data as WalkerOS.Consent;
    // Derive the consent keys from config.consent - iterate every key the
    // destination declared as required. If ALL required keys are granted,
    // opt IN; otherwise opt OUT.
    const required = context.config?.consent;
    if (!required || Object.keys(required).length === 0) return;

    const allGranted = Object.keys(required).every(
      (key) => consent[key] === true,
    );
    if (allGranted) {
      mp.opt_in_tracking();
    } else {
      mp.opt_out_tracking();
    }
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
