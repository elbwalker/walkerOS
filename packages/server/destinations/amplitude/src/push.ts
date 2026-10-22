import type { Collector, Destination, Logger, WalkerOS } from '@walkeros/core';
import type {
  PushFn,
  PushBatchFn,
  AmplitudeSDK,
  EventOptions,
  IdentifyInstance,
  Rule,
  Settings,
} from './types';
import {
  getMappingValue,
  isArray,
  isDefined,
  isNumber,
  isObject,
  isString,
  isThenable,
  flattenIncludeSections,
  StepError,
} from '@walkeros/core';
import { batchOutcome } from '@walkeros/server-core';
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

/** An injected client (tests, simulation): one that can at least track. */
function isAmplitudeSDK(value: unknown): value is AmplitudeSDK {
  return isObject(value) && typeof value.track === 'function';
}

/** The client of `env.amplitude` when one is injected, else the SDK. */
export function getAmplitude(env: unknown): AmplitudeSDK {
  const injected = isObject(env) ? env.amplitude : undefined;
  return isAmplitudeSDK(injected)
    ? injected
    : (amplitudeSDK as unknown as AmplitudeSDK);
}

/**
 * Hand one call to the SDK; the promise settles once Amplitude answered it.
 * The SDK resolves the call's promise after the send with a result whose
 * `code` is the HTTP status (0 for a failed request), never rejecting, so a
 * code outside 2xx fails. An injected client may answer with a promise of its
 * own.
 */
async function call(message: string, send: () => unknown): Promise<void> {
  let result: unknown;
  try {
    const answer: unknown = await send();
    result =
      isObject(answer) && isThenable(answer.promise)
        ? await answer.promise
        : answer;
  } catch (error) {
    throw new StepError(message, { code: 'transport', cause: error });
  }
  const code =
    isObject(result) && isNumber(result.code) ? result.code : undefined;
  if (code !== undefined && (code < 200 || code >= 300))
    throw new StepError(`${message} (code ${code})`, {
      code: 'transport',
      status: code || undefined,
    });
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
  logger.debug(`Amplitude skipped ${call}: ${key} resolved to nothing`, {
    event: event.name,
  });
}

/** A call's outcome, marked as handled until its batch reads it. */
function held(sent: Promise<void>): Promise<void> {
  sent.catch(() => undefined);
  return sent;
}

/** The settled calls of one event: the first failure, if any. */
async function delivered(calls: Promise<PromiseSettledResult<void>[]>) {
  for (const result of await calls)
    if (result.status === 'rejected') throw result.reason;
}

/**
 * Hand the calls of one event to the SDK (identify, group, group identify,
 * revenue, track); each returned promise settles on its answer.
 */
async function enqueue(
  amp: AmplitudeSDK,
  event: WalkerOS.Event,
  rule: Rule | undefined,
  data: Destination.Data,
  settings: Partial<Settings>,
  collector: Collector.Instance,
  logger: Logger.Instance,
): Promise<Promise<void>[]> {
  const mappingSettings = rule?.settings || {};
  const calls: Promise<void>[] = [];

  // 1. Resolve identity -- rule-level override wins over destination-level.
  const identifyMapping = mappingSettings.identify ?? settings.identify;
  let identifyResolved: Record<string, unknown> | undefined;
  if (identifyMapping !== undefined) {
    const resolved = await getMappingValue(event, identifyMapping, {
      collector,
    });
    if (isObject(resolved)) {
      identifyResolved = resolved as Record<string, unknown>;
    } else skipped(logger, event, 'identify', 'identify');
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

  // The id Amplitude deduplicates a call by (insert_id): the event id for
  // the track call, the event id and the call type for the others, so a
  // resent event is dropped and the calls of one event are not. A mapped
  // insert_id wins.
  const optionsFor = (type?: string): EventOptions | undefined => {
    if (!event.id) return hasEventOptions ? eventOptions : undefined;
    const insert_id = type ? `${event.id}-${type}` : event.id;
    return { insert_id, ...eventOptions };
  };

  // 4. Identify operations -- fires amplitude.identify() if op keys are present.
  if (identifyResolved) {
    const id = buildIdentify(amp, identifyResolved);
    if (id)
      calls.push(
        held(
          call('Amplitude identify failed', () =>
            amp.identify(id, optionsFor('identify')),
          ),
        ),
      );
  }

  // 5. Group assignment
  if (mappingSettings.group !== undefined) {
    const resolved = await getMappingValue(event, mappingSettings.group, {
      collector,
    });
    const type = isObject(resolved) ? resolved.type : undefined;
    const name = isObject(resolved) ? resolved.name : undefined;
    if (
      isString(type) &&
      (isString(name) || (isArray(name) && name.every(isString)))
    )
      calls.push(
        held(
          call('Amplitude setGroup failed', () =>
            amp.setGroup(type, name, optionsFor('group')),
          ),
        ),
      );
    else skipped(logger, event, 'group', 'group');
  }

  // 6. Group identify (properties on the group)
  if (mappingSettings.groupIdentify !== undefined) {
    const resolved = await getMappingValue(
      event,
      mappingSettings.groupIdentify,
      { collector },
    );
    const type = isObject(resolved) ? resolved.type : undefined;
    const name = isObject(resolved) ? resolved.name : undefined;
    const id =
      isObject(resolved) && isString(type) && isString(name)
        ? buildIdentify(amp, resolved)
        : undefined;
    if (id && isString(type) && isString(name))
      calls.push(
        held(
          call('Amplitude groupIdentify failed', () =>
            amp.groupIdentify(type, name, id, optionsFor('groupIdentify')),
          ),
        ),
      );
    else skipped(logger, event, 'groupIdentify', 'groupIdentify');
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
    if (!items.some(isObject)) skipped(logger, event, 'revenue', 'revenue');
    for (const [index, item] of items.entries()) {
      if (!isObject(item)) continue;
      calls.push(
        held(
          call('Amplitude revenue failed', () =>
            amp.revenue(
              buildRevenue(amp, item),
              optionsFor(`revenue-${index}`),
            ),
          ),
        ),
      );
    }
  }

  // 8. Default track (unless silent: true)
  if (rule?.silent !== true) {
    const eventType = isString(rule?.name) ? rule.name : event.name;

    // Resolve include: rule-level replaces destination-level.
    const include = mappingSettings.include ?? settings.include;
    const eventProperties: Record<string, unknown> = include
      ? flattenIncludeSections(event, include)
      : isObject(data)
        ? (data as Record<string, unknown>)
        : {};

    calls.push(
      held(
        call('Amplitude track failed', () =>
          amp.track(eventType, eventProperties, optionsFor()),
        ),
      ),
    );
  }

  return calls;
}

/** Ask the SDK to send what it holds. */
async function flush(amp: AmplitudeSDK): Promise<void> {
  await amp.flush().promise;
}

/** The settings init resolved, or a StepError. */
function settingsOf(
  settings: Partial<Settings> | undefined,
): Partial<Settings> {
  if (!settings)
    throw new StepError('Amplitude settings missing, init() not run', {
      code: 'not-ready',
    });
  return settings;
}

/** One event: its calls handed to the SDK, sent, and their answers awaited. */
export const push: PushFn = async function (
  event,
  { config, rule, data, collector, env, logger },
) {
  const amp = getAmplitude(env);
  const settings = settingsOf(config.settings);
  const calls = await enqueue(
    amp,
    event,
    rule,
    data,
    settings,
    collector,
    logger,
  );
  if (calls.length) {
    const settled = Promise.allSettled(calls);
    await flush(amp);
    await delivered(settled);
  }
};

/**
 * A flushed `config.batch` batch: every entry's calls handed to the SDK, one
 * flush, and each entry's own outcome from its answers. When nothing landed,
 * the batch throws.
 */
export const pushBatch: PushBatchFn = async function (
  batch,
  { config, collector, env, logger },
) {
  const amp = getAmplitude(env);
  const settings = settingsOf(config.settings);

  // Each entry's answers, or why its calls could not be handed over.
  const outcomes: Array<{
    settled?: Promise<PromiseSettledResult<void>[]>;
    error?: unknown;
  }> = [];
  for (const entry of batch.entries) {
    try {
      const calls = await enqueue(
        amp,
        entry.event,
        entry.rule,
        entry.data,
        settings,
        collector,
        logger,
      );
      outcomes.push({ settled: Promise.allSettled(calls) });
    } catch (error) {
      outcomes.push({ error });
    }
  }

  await flush(amp);

  const failed: Destination.BatchFailure[] = [];
  for (const [index, { settled, error }] of outcomes.entries()) {
    if (!settled) failed.push({ index, error });
    else
      await delivered(settled).catch((reason: unknown) =>
        failed.push({ index, error: reason }),
      );
  }

  return batchOutcome(batch.entries.length, failed);
};
