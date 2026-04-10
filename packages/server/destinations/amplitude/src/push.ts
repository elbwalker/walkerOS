import type {
  PushFn,
  AmplitudeSDK,
  EventOptions,
  IdentifyInstance,
} from './types';
import {
  getMappingValue,
  isArray,
  isDefined,
  isNumber,
  isObject,
  isString,
  flattenIncludeSections,
} from '@walkeros/core';
import * as amplitudeSDK from '@amplitude/analytics-node';

type IdentifyOpKey =
  | 'set'
  | 'setOnce'
  | 'add'
  | 'append'
  | 'prepend'
  | 'preInsert'
  | 'postInsert'
  | 'remove';

const IDENTIFY_OP_KEYS: IdentifyOpKey[] = [
  'set',
  'setOnce',
  'add',
  'append',
  'prepend',
  'preInsert',
  'postInsert',
  'remove',
];

/** Identity keys that map to EventOptions fields (not Identify operations). */
const IDENTITY_KEYS = ['user_id', 'device_id', 'session_id'] as const;

type RevenueFieldSetter =
  | 'setProductId'
  | 'setPrice'
  | 'setQuantity'
  | 'setRevenueType'
  | 'setCurrency'
  | 'setRevenue'
  | 'setReceipt'
  | 'setReceiptSig';

const REVENUE_FIELD_MAP: Record<string, RevenueFieldSetter> = {
  productId: 'setProductId',
  price: 'setPrice',
  quantity: 'setQuantity',
  revenueType: 'setRevenueType',
  currency: 'setCurrency',
  revenue: 'setRevenue',
  receipt: 'setReceipt',
  receiptSig: 'setReceiptSig',
};

export function getAmplitude(
  env: Record<string, unknown> | undefined,
): AmplitudeSDK {
  const amplitude = env?.amplitude as AmplitudeSDK | undefined;
  return amplitude ?? (amplitudeSDK as unknown as AmplitudeSDK);
}

/**
 * Deterministic string -> positive integer hash (djb2).
 * Used for session_id when walkerOS provides a string session.
 */
function hashStringToInt(value: string): number {
  let hash = 5381;
  for (let i = 0; i < value.length; i++) {
    hash = ((hash << 5) + hash + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function buildIdentify(
  amp: AmplitudeSDK,
  resolved: Record<string, unknown>,
): IdentifyInstance | undefined {
  let identify: IdentifyInstance | undefined;
  const ensure = () => {
    if (!identify) identify = new amp.Identify();
    return identify;
  };

  for (const op of IDENTIFY_OP_KEYS) {
    const bag = resolved[op];
    if (!isObject(bag)) continue;
    for (const [prop, value] of Object.entries(bag)) {
      if (!isDefined(value)) continue;
      if (op === 'add') {
        if (isNumber(value)) ensure().add(prop, value);
      } else {
        ensure()[op](prop, value);
      }
    }
  }

  if (isArray(resolved.unset)) {
    for (const prop of resolved.unset) {
      if (isString(prop)) ensure().unset(prop);
    }
  }

  if (resolved.clearAll === true) {
    ensure().clearAll();
  }

  return identify;
}

function buildRevenue(
  amp: AmplitudeSDK,
  item: Record<string, unknown>,
): InstanceType<AmplitudeSDK['Revenue']> {
  const rev = new amp.Revenue();
  for (const [key, setter] of Object.entries(REVENUE_FIELD_MAP)) {
    const value = item[key];
    if (!isDefined(value)) continue;
    (rev[setter] as (v: unknown) => unknown)(value);
  }
  if (isObject(item.eventProperties)) {
    rev.setEventProperties(item.eventProperties as Record<string, unknown>);
  }
  return rev;
}

/**
 * Build EventOptions from resolved identity and eventOptions mappings.
 */
function buildEventOptions(
  identityResolved?: Record<string, unknown>,
  eventOptionsResolved?: Record<string, unknown>,
): EventOptions {
  const opts: EventOptions = {};

  if (identityResolved) {
    if (isString(identityResolved.user_id))
      opts.user_id = identityResolved.user_id;
    if (isString(identityResolved.device_id))
      opts.device_id = identityResolved.device_id;
    if (identityResolved.session_id !== undefined) {
      const session = identityResolved.session_id;
      opts.session_id = isNumber(session)
        ? session
        : isString(session) && /^\d+$/.test(session)
          ? Number(session)
          : isString(session)
            ? hashStringToInt(session)
            : undefined;
    }
  }

  if (eventOptionsResolved) {
    // Copy all recognized EventOptions fields
    for (const [key, value] of Object.entries(eventOptionsResolved)) {
      if (
        isDefined(value) &&
        !IDENTITY_KEYS.includes(key as (typeof IDENTITY_KEYS)[number])
      ) {
        (opts as Record<string, unknown>)[key] = value;
      }
    }
  }

  return opts;
}

export const push: PushFn = async function (
  event,
  { config, rule, data, collector, env },
) {
  const amp = getAmplitude(env as Record<string, unknown> | undefined);
  const settings = config.settings!;
  const mappingSettings = rule?.settings || {};

  // 1. Resolve identity -- rule-level override wins over destination-level.
  const identifyMapping = mappingSettings.identify ?? settings.identify;
  let identifyResolved: Record<string, unknown> | undefined;
  if (identifyMapping !== undefined) {
    const resolved = await getMappingValue(event, identifyMapping, {
      collector,
    });
    if (isObject(resolved)) {
      identifyResolved = resolved as Record<string, unknown>;
    }
  }

  // 2. Resolve eventOptions -- rule-level override wins over destination-level.
  const eventOptionsMapping =
    mappingSettings.eventOptions ?? settings.eventOptions;
  let eventOptionsResolved: Record<string, unknown> | undefined;
  if (eventOptionsMapping !== undefined) {
    const resolved = await getMappingValue(event, eventOptionsMapping, {
      collector,
    });
    if (isObject(resolved)) {
      eventOptionsResolved = resolved as Record<string, unknown>;
    }
  }

  // 3. Build EventOptions from identity + eventOptions.
  const eventOptions = buildEventOptions(
    identifyResolved,
    eventOptionsResolved,
  );
  const hasEventOptions = Object.keys(eventOptions).length > 0;

  // 4. Identify operations -- fires amplitude.identify() if op keys are present.
  if (identifyResolved) {
    const id = buildIdentify(amp, identifyResolved);
    if (id) amp.identify(id, hasEventOptions ? eventOptions : undefined);
  }

  // 5. Group assignment
  if (mappingSettings.group !== undefined) {
    const resolved = await getMappingValue(event, mappingSettings.group, {
      collector,
    });
    if (isObject(resolved)) {
      const { type, name } = resolved as {
        type?: unknown;
        name?: unknown;
      };
      if (isString(type) && (isString(name) || isArray(name))) {
        amp.setGroup(
          type,
          name as string | string[],
          hasEventOptions ? eventOptions : undefined,
        );
      }
    }
  }

  // 6. Group identify (properties on the group)
  if (mappingSettings.groupIdentify !== undefined) {
    const resolved = await getMappingValue(
      event,
      mappingSettings.groupIdentify,
      { collector },
    );
    if (isObject(resolved)) {
      const { type, name } = resolved as {
        type?: unknown;
        name?: unknown;
      };
      if (isString(type) && isString(name)) {
        const id = buildIdentify(amp, resolved as Record<string, unknown>);
        if (id)
          amp.groupIdentify(
            type,
            name,
            id,
            hasEventOptions ? eventOptions : undefined,
          );
      }
    }
  }

  // 7. Revenue -- single object or array from loop -> N revenue() calls.
  if (mappingSettings.revenue !== undefined) {
    const resolved = await getMappingValue(event, mappingSettings.revenue, {
      collector,
    });
    const items = isArray(resolved)
      ? (resolved as Record<string, unknown>[])
      : isObject(resolved)
        ? [resolved as Record<string, unknown>]
        : [];
    for (const item of items) {
      if (!isObject(item)) continue;
      amp.revenue(
        buildRevenue(amp, item),
        hasEventOptions ? eventOptions : undefined,
      );
    }
  }

  // 8. Default track (unless skip: true)
  if (rule?.skip !== true) {
    const eventType = isString(rule?.name) ? rule.name : event.name;

    // Resolve include: rule-level replaces destination-level.
    const include = mappingSettings.include ?? settings.include;
    const eventProperties: Record<string, unknown> = include
      ? flattenIncludeSections(event, include)
      : isObject(data)
        ? (data as Record<string, unknown>)
        : {};

    amp.track(
      eventType,
      eventProperties,
      hasEventOptions ? eventOptions : undefined,
    );
  }
};
