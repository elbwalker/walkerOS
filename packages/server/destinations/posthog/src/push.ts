import type { Collector, Destination, WalkerOS } from '@walkeros/core';
import type {
  PostHogClient,
  PushBatchFn,
  PushFn,
  Rule,
  Settings,
} from './types';
import { getMappingValue, isObject, isString, StepError } from '@walkeros/core';

/**
 * Run one flush to its end. The SDK reports a failed send as an `error`
 * event and a rejected flush; the call listens for the event while it runs.
 * Sends never overlap (`exclusive`), so the event belongs to this flush.
 */
async function call(
  client: PostHogClient,
  message: string,
  send: () => unknown,
): Promise<void> {
  let failure: unknown;
  const off = client.on?.('error', (error) => {
    failure = failure ?? error;
  });
  try {
    await send();
  } catch (error) {
    failure = failure ?? error;
  } finally {
    off?.();
  }
  if (failure !== undefined)
    throw new StepError(message, { code: 'transport', cause: failure });
}

/** Run one queueing call; an injected client may answer with a promise. */
async function queue(message: string, send: () => unknown): Promise<void> {
  try {
    await send();
  } catch (error) {
    throw new StepError(message, { code: 'transport', cause: error });
  }
}

/**
 * One send at a time per client: its calls queued, then one flush. A flush
 * sends the whole queue, so a send that overlapped another could be carried,
 * and failed, by the other's request without hearing of it.
 */
function exclusive(
  settings: Partial<Settings>,
  task: () => Promise<void>,
): Promise<void> {
  const running = (settings._sending ?? Promise.resolve()).then(task);
  settings._sending = running.catch(() => undefined);
  return running;
}

/** The settings and client init resolved, or a StepError. */
function clientOf(settings: Partial<Settings> | undefined): {
  settings: Partial<Settings>;
  client: PostHogClient;
} {
  const client = settings?.client;
  if (!settings || !client)
    throw new StepError('PostHog client not initialized', {
      code: 'not-ready',
    });
  return { settings, client };
}

/** One event: its calls queued and sent by one flush. */
export const push: PushFn = async function (
  event,
  { config, rule, data, collector },
) {
  const { settings, client } = clientOf(config.settings);
  await exclusive(settings, async () => {
    await send(event, rule, data, settings, client, collector);
    await call(client, 'PostHog send failed', () => client.flush());
  });
};

/**
 * A flushed `config.batch` batch: every entry's calls queued, then one flush
 * sends them. An entry whose calls could not be queued fails alone; a failed
 * flush fails the batch, since PostHog answers a request as a whole.
 */
export const pushBatch: PushBatchFn = async function (
  batch,
  { config, collector },
) {
  const { settings, client } = clientOf(config.settings);
  const failed: Destination.BatchFailure[] = [];

  await exclusive(settings, async () => {
    for (const [index, entry] of batch.entries.entries())
      await send(
        entry.event,
        entry.rule,
        entry.data,
        settings,
        client,
        collector,
      ).catch((error: unknown) => failed.push({ index, error }));

    if (failed.length < batch.entries.length)
      await call(client, 'PostHog send failed', () => client.flush());
  });

  // Nothing landed: a whole-batch failure, which the breaker counts.
  if (failed.length && failed.length === batch.entries.length)
    throw failed[0].error;
  if (failed.length) return { failed };
};

/** The calls of one event (identify, group identify, capture). */
async function send(
  event: WalkerOS.Event,
  rule: Rule | undefined,
  data: Destination.Data,
  settings: Partial<Settings>,
  client: PostHogClient,
  collector: Collector.Instance,
): Promise<void> {
  const mappingSettings = (rule?.settings || {}) as Record<string, unknown>;

  // Resolve distinctId: rule-level identify wins over destination-level
  const identifyMapping = mappingSettings.identify ?? settings.identify;
  let distinctId: string | undefined;
  let identifyResolved: Record<string, unknown> | undefined;

  if (identifyMapping !== undefined) {
    const resolved = await getMappingValue(event, identifyMapping, {
      collector,
    });
    if (isObject(resolved)) {
      identifyResolved = resolved as Record<string, unknown>;
      if (isString(identifyResolved.distinctId)) {
        distinctId = identifyResolved.distinctId as string;
      }
    }
  }

  // Fallback distinctId from event.user
  if (!distinctId) {
    distinctId =
      (isString(event.user?.id) ? event.user.id : undefined) ||
      (isString(event.user?.hash) ? event.user.hash : undefined) ||
      (isString(event.user?.session) ? event.user.session : undefined) ||
      'anonymous';
  }

  // 1. Identity - if $set or $set_once present, call client.identify()
  if (identifyResolved) {
    const $set = isObject(identifyResolved.$set)
      ? (identifyResolved.$set as Record<string, unknown>)
      : undefined;
    const $setOnce = isObject(identifyResolved.$set_once)
      ? (identifyResolved.$set_once as Record<string, unknown>)
      : undefined;

    if ($set || $setOnce) {
      const properties: Record<string, unknown> = {};
      if ($set) properties.$set = $set;
      if ($setOnce) properties.$set_once = $setOnce;
      await queue('PostHog identify failed', () =>
        client.identify({ distinctId, properties }),
      );
    }
  }

  // 2. Group - resolve group mapping (rule-level wins)
  const groupMapping = mappingSettings.group ?? settings.group;
  let groups: Record<string, string | number> | undefined;

  if (groupMapping !== undefined) {
    const resolved = await getMappingValue(event, groupMapping, {
      collector,
    });
    if (isObject(resolved)) {
      const groupResolved = resolved as Record<string, unknown>;
      const type = groupResolved.type;
      const key = groupResolved.key;
      const properties = isObject(groupResolved.properties)
        ? (groupResolved.properties as Record<string, unknown>)
        : undefined;

      if (isString(type) && (isString(key) || typeof key === 'number')) {
        // If properties present, call groupIdentify
        // No immediate variant: queued, then flushed in this push.
        if (properties)
          await queue('PostHog group identify failed', () =>
            client.groupIdentify({
              groupType: type,
              groupKey: String(key),
              properties,
            }),
          );
        // Build groups object for capture
        groups = { [type]: key as string | number };
      }
    }
  }

  // 3. Capture - unless rule opts out via silent
  if (rule?.silent !== true) {
    const eventName = isString(rule?.name) ? rule.name : event.name;
    const properties = isObject(data) ? (data as Record<string, unknown>) : {};

    const captureArgs: Record<string, unknown> = {
      distinctId,
      event: eventName,
      properties,
    };
    if (groups) captureArgs.groups = groups;

    await queue('PostHog capture failed', () =>
      client.capture(captureArgs as Parameters<PostHogClient['capture']>[0]),
    );
  }
}
