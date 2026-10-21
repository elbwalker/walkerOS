import type { WalkerOS } from '@walkeros/core';
import {
  getMappingValue,
  isArray,
  isBoolean,
  isObject,
  isString,
  StepError,
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

/** Runs one Mixpanel call; a throw or a rejection becomes a StepError of `code`. */
async function call(
  fn: () => unknown,
  code: string,
  message: string,
): Promise<void> {
  try {
    await fn();
  } catch (error) {
    throw new StepError(message, { code, cause: error });
  }
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
  await call(
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
    await call(
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
      await call(
        () => mp.people.unset(names),
        'transport',
        'Mixpanel people.unset failed',
      );
    applied = names.length > 0 || applied;
  }

  if (resolved.delete_user === true) {
    await call(
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
    await call(
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
      await call(
        () => group.unset(names),
        'transport',
        'Mixpanel group.unset failed',
      );
    applied = names.length > 0 || applied;
  }

  if (resolved.delete === true) {
    await call(
      () => group.delete(),
      'transport',
      'Mixpanel group.delete failed',
    );
    applied = true;
  }

  return applied;
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
    await call(
      () => mp.init(apiKey, initConfig),
      'vendor-not-ready',
      'Mixpanel init failed',
    );

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
    // Whether any Mixpanel call or state change came out of this event
    let sent = false;

    // 1. Reset - fires first so subsequent identity calls start clean.
    if (mappingSettings.reset !== undefined) {
      const resolved = isBoolean(mappingSettings.reset)
        ? mappingSettings.reset
        : await getMappingValue(event, mappingSettings.reset, { collector });
      if (resolved) {
        await call(() => mp.reset(), 'transport', 'Mixpanel reset failed');
        state.lastIdentity = {};
        sent = true;
      }
    }

    // 2. Identity - rule-level override wins over destination-level.
    const identifyMapping = mappingSettings.identify ?? settings.identify;
    if (identifyMapping !== undefined) {
      const resolved = await getMappingValue(event, identifyMapping, {
        collector,
      });
      if (isObject(resolved)) {
        state.lastIdentity = await applyIdentify(
          mp,
          resolved as Record<string, unknown>,
          state.lastIdentity,
        );
        sent = sent || isString(resolved.distinctId);
      }
    }

    // 3. People operations - fires zero or more mp.people.* calls.
    if (mappingSettings.people !== undefined) {
      const resolved = await getMappingValue(event, mappingSettings.people, {
        collector,
      });
      if (isObject(resolved)) {
        sent =
          (await applyPeople(mp, resolved as Record<string, unknown>)) || sent;
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
          await call(
            () => mp.set_group(key, id as string | string[]),
            'transport',
            'Mixpanel set_group failed',
          );
          sent = true;
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
        sent =
          (await applyGroupProfile(mp, resolved as Record<string, unknown>)) ||
          sent;
      }
    }

    // 6. Default track - unless the rule opts out via silent.
    if (rule?.silent !== true) {
      const eventName = isString(rule?.name) ? rule.name : event.name;
      const properties = isObject(data)
        ? (data as Record<string, unknown>)
        : {};
      await call(
        () => mp.track(eventName, properties),
        'transport',
        'Mixpanel track failed',
      );
      sent = true;
    }

    // A silent rule none of whose mappings resolved sent nothing at all
    if (!sent && rule?.silent === true && Object.keys(mappingSettings).length)
      throw new StepError(
        'Mixpanel mappings resolved to nothing for this event',
        {
          code: 'missing-input',
        },
      );

    // Persist state mutations back onto config.settings.
    settings._state = state;
  },

  async on(type, context) {
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
    await call(
      () => (allGranted ? mp.opt_in_tracking() : mp.opt_out_tracking()),
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
