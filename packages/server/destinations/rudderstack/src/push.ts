import type { Collector, Destination, Logger, WalkerOS } from '@walkeros/core';
import type {
  PushFn,
  PushBatchFn,
  Settings,
  RuntimeState,
  RudderStackAnalyticsMock,
  RudderStackCallback,
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
 * Hand one call to the SDK. The promise settles once RudderStack sent it: the
 * SDK answers through the callback, with the error when the send failed; an
 * injected client may answer with a promise instead. A call the SDK refuses
 * at once (it validates each message) fails the same way. The promise is
 * marked handled at once, since its event's outcome reads it only after the
 * flush.
 */
function call(
  message: string,
  send: (done: RudderStackCallback) => unknown,
): Promise<void> {
  const sent = new Promise<void>((resolve, reject) => {
    const fail = (error: unknown) => reject(failure(message, error));
    let answer: unknown;
    try {
      answer = send((error) => (error ? fail(error) : resolve()));
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
 * A failed send: `timeout` when the SDK's last request timed out (axios
 * answers `ECONNABORTED`, or `ETIMEDOUT`), else `transport`.
 */
function failure(message: string, error: unknown): StepError {
  const code: unknown =
    typeof error === 'object' && error !== null
      ? Reflect.get(error, 'code')
      : undefined;
  const timedOut = code === 'ECONNABORTED' || code === 'ETIMEDOUT';
  return new StepError(message, {
    code: timedOut ? 'timeout' : 'transport',
    cause: error,
  });
}

/**
 * The id RudderStack deduplicates a call by: the event id for the track
 * call, the event id and the call type for the others, so a resent event is
 * dropped and the calls of one event are not.
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
 * Ask the SDK to send what it holds, one flush at a time. A failed send
 * reaches each call's callback; the flush itself does not reject (the SDK's
 * error handler is set).
 */
function flush(settings: Partial<Settings>, sdk: RudderStackAnalyticsMock) {
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
  logger.debug(`RudderStack skipped ${call}: ${key} resolved to nothing`, {
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
  sdk: RudderStackAnalyticsMock,
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
    throw new StepError(
      'RudderStack needs a userId or anonymousId for the event',
      {
        code: 'missing-input',
      },
    );

  // Build identity object for every SDK call
  const identity: Record<string, unknown> = {};
  if (userId) identity.userId = userId;
  if (anonymousId) identity.anonymousId = anonymousId;

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
    );
    if (sent) calls.push(sent);
    else skipped(logger, event, 'screen', 'screen');
  }

  // 6. Alias
  if (mappingSettings.alias !== undefined) {
    const { sent } = await applyAlias(
      sdk,
      mappingSettings.alias,
      event,
      withMessageId(identity, event, 'alias'),
      collector,
      timestamp,
    );
    if (sent) calls.push(sent);
    else skipped(logger, event, 'alias', 'alias');
  }

  // 7. Track (unless silent: true)
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

    calls.push(
      call('RudderStack track failed', (done) => sdk.track(params, done)),
    );
  }

  return calls.filter((sent): sent is Promise<void> => sent !== undefined);
}

/** The SDK the destination sends through, or a StepError. */
function sdkOf(
  settings: Partial<Settings> | undefined,
  env: { analytics?: RudderStackAnalyticsMock } | undefined,
): RudderStackAnalyticsMock {
  const sdk = env?.analytics || settings?._analytics;
  if (!settings || !sdk)
    throw new StepError('RudderStack Analytics not initialized', {
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

function applyIdentify(
  sdk: RudderStackAnalyticsMock,
  resolved: Record<string, unknown>,
  identity: Record<string, unknown>,
  state: RuntimeState,
  timestamp: Date,
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

  // Remembered at once, so a batch identifies a user once; forgotten again
  // when the delivery fails, so the next event identifies again.
  const current = {
    userId: identifyUserId,
    anonymousId: identity.anonymousId as string | undefined,
    traitsHash,
  };
  state.lastIdentity = current;
  return call('RudderStack identify failed', (done) =>
    sdk.identify(params, done),
  ).catch((error: unknown) => {
    if (state.lastIdentity === current) state.lastIdentity = undefined;
    throw error;
  });
}

function applyGroup(
  sdk: RudderStackAnalyticsMock,
  resolved: Record<string, unknown>,
  identity: Record<string, unknown>,
  state: RuntimeState,
  timestamp: Date,
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

  // Remembered at once, forgotten again when the delivery fails.
  const current = { groupId, traitsHash };
  state.lastGroup = current;
  return call('RudderStack group failed', (done) =>
    sdk.group(params, done),
  ).catch((error: unknown) => {
    if (state.lastGroup === current) state.lastGroup = undefined;
    throw error;
  });
}

/** The page call, handed to the SDK; its delivery settles at the flush. */
async function applyPage(
  sdk: RudderStackAnalyticsMock,
  pageMapping: unknown,
  event: WalkerOS.Event,
  identity: Record<string, unknown>,
  collector: unknown,
  timestamp: Date,
): Promise<{ sent?: Promise<void> }> {
  const params: Record<string, unknown> = { ...identity, timestamp };

  if (pageMapping === true) {
    return {
      sent: call('RudderStack page failed', (done) => sdk.page(params, done)),
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

  return {
    sent: call('RudderStack page failed', (done) => sdk.page(params, done)),
  };
}

/** The screen call, handed to the SDK; its delivery settles at the flush. */
async function applyScreen(
  sdk: RudderStackAnalyticsMock,
  screenMapping: unknown,
  event: WalkerOS.Event,
  identity: Record<string, unknown>,
  collector: unknown,
  timestamp: Date,
): Promise<{ sent?: Promise<void> }> {
  const params: Record<string, unknown> = { ...identity, timestamp };

  if (screenMapping === true) {
    return {
      sent: call('RudderStack screen failed', (done) =>
        sdk.screen(params, done),
      ),
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

  return {
    sent: call('RudderStack screen failed', (done) => sdk.screen(params, done)),
  };
}

/** The alias call, handed to the SDK; its delivery settles at the flush. */
async function applyAlias(
  sdk: RudderStackAnalyticsMock,
  aliasMapping: unknown,
  event: WalkerOS.Event,
  identity: Record<string, unknown>,
  collector: unknown,
  timestamp: Date,
): Promise<{ sent?: Promise<void> }> {
  const resolved = await getMappingValue(
    event,
    aliasMapping as Parameters<typeof getMappingValue>[1],
    { collector } as Parameters<typeof getMappingValue>[2],
  );
  if (!isObject(resolved)) return {};

  const r = resolved as { previousId?: unknown };
  const previousId = isString(r.previousId) ? r.previousId : undefined;
  if (!previousId) return {};

  const params: Record<string, unknown> = {
    previousId,
    timestamp,
  };
  // Alias uses userId (the new canonical ID) -- not full identity spread
  if (identity.userId) params.userId = identity.userId;
  if (identity.messageId) params.messageId = identity.messageId;

  return {
    sent: call('RudderStack alias failed', (done) => sdk.alias(params, done)),
  };
}
