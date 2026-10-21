import type { Collector, Destination, Logger, WalkerOS } from '@walkeros/core';
import type {
  PushFn,
  PushBatchFn,
  Settings,
  RuntimeState,
  SegmentAnalyticsMock,
  SegmentCallback,
  Rule,
} from './types';
import {
  getMappingValue,
  isObject,
  isString,
  isArray,
  isThenable,
  StepError,
} from '@walkeros/core';
import { batchOutcome } from '@walkeros/server-core';

/**
 * Hand one call to the SDK. The promise settles once Segment delivered it:
 * the SDK answers through the callback, with the reason when the delivery
 * failed; an injected client may answer with a promise instead. A call the
 * SDK refuses at once fails the same way. The promise is marked handled at
 * once, since its event's outcome reads it only after the flush.
 */
function call(
  message: string,
  send: (done: SegmentCallback) => unknown,
): Promise<void> {
  const sent = new Promise<void>((resolve, reject) => {
    const fail = (error: unknown) => reject(failure(message, error));
    let answer: unknown;
    try {
      answer = send((error) =>
        error === undefined || error === null ? resolve() : fail(error),
      );
    } catch (error) {
      fail(error);
      return;
    }
    if (isThenable(answer)) answer.then(() => resolve(), fail);
  });
  sent.catch(() => undefined);
  return sent;
}

/**
 * A failed delivery: `timeout` when the SDK's last request timed out (it
 * aborts a request after `httpRequestTimeout`), else `transport`.
 */
function failure(message: string, error: unknown): StepError {
  // A DOMException, from another realm in some runtimes: read by its name.
  const name: unknown =
    typeof error === 'object' && error !== null
      ? Reflect.get(error, 'name')
      : undefined;
  const timedOut = name === 'AbortError' || name === 'TimeoutError';
  return new StepError(message, {
    code: timedOut ? 'timeout' : 'transport',
    cause: error,
  });
}

/**
 * The id Segment deduplicates a call by: the event id for the track call,
 * the event id and the call type for the others, so a resent event is
 * dropped by Segment and the calls of one event are not.
 */
function messageIdOf(event: WalkerOS.Event, type?: string): string | undefined {
  if (!event.id) return undefined;
  return type ? `${event.id}-${type}` : event.id;
}

/** The identity of one call, with the call's own messageId. */
function withMessageId(
  identity: Record<string, unknown>,
  event: WalkerOS.Event,
  type: string,
): Record<string, unknown> {
  const messageId = messageIdOf(event, type);
  return messageId ? { ...identity, messageId } : identity;
}

/**
 * Ask the SDK to send what it holds, one flush at a time: the SDK skips a
 * flush that overlaps a running one, which would leave calls waiting for its
 * flush interval.
 */
function flush(settings: Partial<Settings>, sdk: SegmentAnalyticsMock) {
  const flushing = (settings._flushing ?? Promise.resolve()).then(() =>
    sdk.flush(),
  );
  settings._flushing = flushing.catch(() => undefined);
  return flushing;
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
  logger.debug(`Segment skipped ${call}: ${key} resolved to nothing`, {
    event: event.name,
  });
}

/** The settled calls of one event: the first failure, if any. */
async function delivered(calls: Promise<PromiseSettledResult<void>[]>) {
  for (const result of await calls)
    if (result.status === 'rejected') throw result.reason;
}

/**
 * Hand the calls of one event to the SDK (identify, group, page, screen,
 * track) and answer their deliveries. An event without userId or anonymousId
 * cannot be sent and fails with missing-input.
 */
async function enqueue(
  event: WalkerOS.Event,
  rule: Rule | undefined,
  data: Destination.Data,
  settings: Partial<Settings>,
  sdk: SegmentAnalyticsMock,
  collector: Collector.Instance,
  logger: Logger.Instance,
): Promise<Promise<void>[]> {
  const state: RuntimeState = settings._state || {};
  settings._state = state;
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

  if (!userId && !anonymousId)
    throw new StepError('Segment needs a userId or anonymousId for the event', {
      code: 'missing-input',
    });

  // Build identity object for every SDK call
  const identity: Record<string, unknown> = {};
  if (userId) identity.userId = userId;
  if (anonymousId) identity.anonymousId = anonymousId;

  // Build consent context
  const context = buildConsentContext(event, settings);
  const calls: Array<Promise<void> | undefined> = [];

  // 2. Identify -- rule-level overrides destination-level
  const identifyMapping = mappingSettings.identify ?? settings.identify;
  if (identifyMapping !== undefined) {
    const resolved = await getMappingValue(event, identifyMapping, {
      collector,
    });
    if (isObject(resolved))
      calls.push(
        applyIdentify(
          sdk,
          resolved,
          withMessageId(identity, event, 'identify'),
          state,
          timestamp,
          context,
        ),
      );
    else skipped(logger, event, 'identify', 'identify');
  }

  // 3. Group -- rule-level overrides destination-level
  const groupMapping = mappingSettings.group ?? settings.group;
  if (groupMapping !== undefined) {
    const resolved = await getMappingValue(event, groupMapping, {
      collector,
    });
    if (isObject(resolved) && isString(resolved.groupId))
      calls.push(
        applyGroup(
          sdk,
          resolved,
          withMessageId(identity, event, 'group'),
          state,
          timestamp,
          context,
        ),
      );
    else skipped(logger, event, 'group', 'group');
  }

  // 4. Page (the call is not awaited here: it is delivered at the flush)
  if (mappingSettings.page !== undefined) {
    const { sent } = await applyPage(
      sdk,
      mappingSettings.page,
      event,
      withMessageId(identity, event, 'page'),
      collector,
      timestamp,
      context,
    );
    if (sent) calls.push(sent);
    else skipped(logger, event, 'page', 'page');
  }

  // 5. Screen
  if (mappingSettings.screen !== undefined) {
    const { sent } = await applyScreen(
      sdk,
      mappingSettings.screen,
      event,
      withMessageId(identity, event, 'screen'),
      collector,
      timestamp,
      context,
    );
    if (sent) calls.push(sent);
    else skipped(logger, event, 'screen', 'screen');
  }

  // 6. Track (unless silent: true)
  if (rule?.silent !== true) {
    const eventName = isString(rule?.name) ? rule.name : event.name;
    const properties = isObject(data) ? (data as Record<string, unknown>) : {};

    const params: Record<string, unknown> = {
      ...identity,
      event: eventName,
      properties,
      timestamp,
    };
    const messageId = messageIdOf(event);
    if (messageId) params.messageId = messageId;
    if (context) params.context = context;

    calls.push(call('Segment track failed', (done) => sdk.track(params, done)));
  }

  return calls.filter((sent): sent is Promise<void> => sent !== undefined);
}

/** The SDK the destination sends through, or a StepError. */
function sdkOf(
  settings: Partial<Settings> | undefined,
  env: { analytics?: SegmentAnalyticsMock } | undefined,
): SegmentAnalyticsMock {
  const sdk = env?.analytics || settings?._analytics;
  if (!settings || !sdk)
    throw new StepError('Segment Analytics not initialized', {
      code: 'not-ready',
    });
  return sdk;
}

/** One event: its calls handed to the SDK, sent, and their deliveries awaited. */
export const push: PushFn = async function (
  event,
  { config, rule, data, collector, env, logger },
) {
  const settings = config.settings ?? {};
  const sdk = sdkOf(config.settings, env);
  const calls = await enqueue(
    event,
    rule,
    data,
    settings,
    sdk,
    collector,
    logger,
  );
  if (calls.length) {
    const settled = Promise.allSettled(calls);
    await flush(settings, sdk);
    await delivered(settled);
  }
};

/**
 * A flushed `config.batch` batch: every entry's calls handed to the SDK, one
 * flush, and each entry's own outcome from its deliveries. An entry that
 * cannot be sent fails alone; when nothing landed, the batch throws.
 */
export const pushBatch: PushBatchFn = async function (
  batch,
  { config, collector, env, logger },
) {
  const settings = config.settings ?? {};
  const sdk = sdkOf(config.settings, env);
  // Each entry's deliveries, or why its calls could not be handed over.
  const outcomes: Array<{
    settled?: Promise<PromiseSettledResult<void>[]>;
    error?: unknown;
  }> = [];

  for (const entry of batch.entries) {
    try {
      const calls = await enqueue(
        entry.event,
        entry.rule,
        entry.data,
        settings,
        sdk,
        collector,
        logger,
      );
      outcomes.push({ settled: Promise.allSettled(calls) });
    } catch (error) {
      outcomes.push({ error });
    }
  }

  await flush(settings, sdk);

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
  settings: Partial<Settings>,
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
): Promise<void> | undefined {
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

  if (!userIdChanged && !traitsChanged) return undefined;

  const params: Record<string, unknown> = {
    ...identity,
    timestamp,
  };
  if (identifyUserId) params.userId = identifyUserId;
  if (traits) params.traits = traits;
  if (context) params.context = context;

  // Remembered at once, so a batch identifies a user once; forgotten again
  // when the delivery fails, so the next event identifies again.
  const current = {
    userId: identifyUserId,
    anonymousId: identity.anonymousId as string | undefined,
    traitsHash,
  };
  state.lastIdentity = current;
  return call('Segment identify failed', (done) =>
    sdk.identify(params, done),
  ).catch((error: unknown) => {
    if (state.lastIdentity === current) state.lastIdentity = undefined;
    throw error;
  });
}

function applyGroup(
  sdk: SegmentAnalyticsMock,
  resolved: Record<string, unknown>,
  identity: Record<string, unknown>,
  state: RuntimeState,
  timestamp: Date,
  context?: Record<string, unknown>,
): Promise<void> | undefined {
  const groupId = isString(resolved.groupId) ? resolved.groupId : undefined;
  if (!groupId) return undefined;

  const last = state.lastGroup || {};
  const traits =
    isObject(resolved.traits) && !isArray(resolved.traits)
      ? (resolved.traits as Record<string, unknown>)
      : undefined;

  const traitsHash = hashTraits(traits);
  const groupIdChanged = groupId !== last.groupId;
  const traitsChanged = traitsHash !== (last.traitsHash ?? '');
  if (!groupIdChanged && !traitsChanged) return undefined;

  const params: Record<string, unknown> = {
    ...identity,
    groupId,
    timestamp,
  };
  if (traits) params.traits = traits;
  if (context) params.context = context;

  // Remembered at once, forgotten again when the delivery fails.
  const current = { groupId, traitsHash };
  state.lastGroup = current;
  return call('Segment group failed', (done) => sdk.group(params, done)).catch(
    (error: unknown) => {
      if (state.lastGroup === current) state.lastGroup = undefined;
      throw error;
    },
  );
}

/** The page call, handed to the SDK; its delivery settles at the flush. */
async function applyPage(
  sdk: SegmentAnalyticsMock,
  pageMapping: unknown,
  event: WalkerOS.Event,
  identity: Record<string, unknown>,
  collector: unknown,
  timestamp: Date,
  context?: Record<string, unknown>,
): Promise<{ sent?: Promise<void> }> {
  const params: Record<string, unknown> = { ...identity, timestamp };

  if (pageMapping === true) {
    if (context) params.context = context;
    return {
      sent: call('Segment page failed', (done) => sdk.page(params, done)),
    };
  }

  const resolved = await getMappingValue(
    event,
    pageMapping as Parameters<typeof getMappingValue>[1],
    { collector } as Parameters<typeof getMappingValue>[2],
  );
  if (!isObject(resolved)) return {};

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

  return {
    sent: call('Segment page failed', (done) => sdk.page(params, done)),
  };
}

/** The screen call, handed to the SDK; its delivery settles at the flush. */
async function applyScreen(
  sdk: SegmentAnalyticsMock,
  screenMapping: unknown,
  event: WalkerOS.Event,
  identity: Record<string, unknown>,
  collector: unknown,
  timestamp: Date,
  context?: Record<string, unknown>,
): Promise<{ sent?: Promise<void> }> {
  const params: Record<string, unknown> = { ...identity, timestamp };

  if (screenMapping === true) {
    if (context) params.context = context;
    return {
      sent: call('Segment screen failed', (done) => sdk.screen(params, done)),
    };
  }

  const resolved = await getMappingValue(
    event,
    screenMapping as Parameters<typeof getMappingValue>[1],
    { collector } as Parameters<typeof getMappingValue>[2],
  );
  if (!isObject(resolved)) return {};

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

  return {
    sent: call('Segment screen failed', (done) => sdk.screen(params, done)),
  };
}
