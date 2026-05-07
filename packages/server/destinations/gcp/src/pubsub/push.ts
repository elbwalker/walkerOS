import type { PushFn, Mapping, Settings } from './types';
import type { Mapping as WalkerOSMapping, Collector } from '@walkeros/core';
import { getMappingValue, isObject } from '@walkeros/core';

const NOT_FOUND_GRPC = 5;
const NOT_FOUND_HTTP = 404;
const PERMISSION_DENIED_GRPC = 7;
const UNAUTHENTICATED_GRPC = 16;
const PERMISSION_DENIED_HTTP = 403;
const UNAUTHENTICATED_HTTP = 401;

interface ErrorWithCode {
  code: number;
}

function hasNumericCode(err: unknown): err is ErrorWithCode {
  if (typeof err !== 'object' || err === null) return false;
  if (!('code' in err)) return false;
  const obj: { code?: unknown } = err;
  return typeof obj.code === 'number';
}

function isNotFound(err: unknown): boolean {
  return (
    hasNumericCode(err) &&
    (err.code === NOT_FOUND_GRPC || err.code === NOT_FOUND_HTTP)
  );
}

function isPermissionError(err: unknown): boolean {
  return (
    hasNumericCode(err) &&
    (err.code === PERMISSION_DENIED_GRPC ||
      err.code === UNAUTHENTICATED_GRPC ||
      err.code === PERMISSION_DENIED_HTTP ||
      err.code === UNAUTHENTICATED_HTTP)
  );
}

interface AttributesShape {
  [key: string]: string;
}

function isStringRecord(value: unknown): value is AttributesShape {
  if (!isObject(value)) return false;
  const candidate: Record<string, unknown> = value;
  for (const key of Object.keys(candidate)) {
    if (typeof candidate[key] !== 'string') return false;
  }
  return true;
}

async function resolveAttributes(
  event: Parameters<PushFn>[0],
  base: WalkerOSMapping.Map | undefined,
  override: WalkerOSMapping.Map | undefined,
  collector: Collector.Instance,
): Promise<AttributesShape | undefined> {
  const result: AttributesShape = {};
  let touched = false;

  if (base) {
    for (const [key, value] of Object.entries(base)) {
      const resolved = await getMappingValue(event, value, { collector });
      if (typeof resolved === 'string') {
        result[key] = resolved;
        touched = true;
      } else if (resolved !== undefined && resolved !== null) {
        result[key] = String(resolved);
        touched = true;
      }
    }
  }

  if (override) {
    for (const [key, value] of Object.entries(override)) {
      const resolved = await getMappingValue(event, value, { collector });
      if (typeof resolved === 'string') {
        result[key] = resolved;
        touched = true;
      } else if (resolved !== undefined && resolved !== null) {
        result[key] = String(resolved);
        touched = true;
      }
    }
  }

  return touched ? result : undefined;
}

function isResolvedSettings(value: unknown): value is Settings {
  if (typeof value !== 'object' || value === null) return false;
  const candidate: { client?: unknown; projectId?: unknown; topic?: unknown } =
    value;
  return (
    candidate.client !== undefined &&
    typeof candidate.projectId === 'string' &&
    candidate.projectId.length > 0 &&
    typeof candidate.topic === 'string' &&
    candidate.topic.length > 0
  );
}

function isMapping(value: unknown): value is Mapping {
  return typeof value === 'object' && value !== null;
}

export const push: PushFn = async function (
  event,
  { config, rule, data, collector, logger, id },
) {
  const settings = config.settings;
  if (!isResolvedSettings(settings)) {
    return logger.throw('settings missing or incomplete, init() not run');
  }

  const { client, projectId, topic: defaultTopic } = settings;

  const ruleSettings: Mapping = isMapping(rule?.settings) ? rule.settings : {};

  const topicName =
    typeof ruleSettings.topic === 'string' && ruleSettings.topic.length > 0
      ? ruleSettings.topic
      : defaultTopic;

  // Resolve ordering key: per-rule overrides settings default. Both are
  // Mapping.Value resolved against the event.
  const orderingValue =
    ruleSettings.orderingKey !== undefined
      ? ruleSettings.orderingKey
      : settings.orderingKey;
  let orderingKey: string | undefined;
  if (orderingValue !== undefined) {
    const resolved = await getMappingValue(event, orderingValue, { collector });
    if (typeof resolved === 'string' && resolved.length > 0) {
      orderingKey = resolved;
    } else if (resolved !== undefined && resolved !== null) {
      orderingKey = String(resolved);
    }
  }

  // Topic handle is constructed inline. Setting messageOrdering on the
  // topic options enables per-key ordering for this publish.
  const topicHandle = client.topic(topicName, {
    messageOrdering: Boolean(orderingKey),
  });

  // Serialize the publish body: mapped data wins over the raw event.
  const body = isObject(data) && Object.keys(data).length > 0 ? data : event;
  const payload = Buffer.from(JSON.stringify(body));

  // Merge attributes: settings default + per-rule overrides.
  const baseAttrs = settings.attributes;
  const ruleAttrs = ruleSettings.attributes;
  const attributes = await resolveAttributes(
    event,
    baseAttrs,
    ruleAttrs,
    collector,
  );

  const message: {
    data: Buffer;
    attributes?: AttributesShape;
    orderingKey?: string;
  } = { data: payload };
  if (attributes && isStringRecord(attributes)) message.attributes = attributes;
  if (orderingKey) message.orderingKey = orderingKey;

  logger.debug('Pub/Sub publish', {
    topic: topicName,
    projectId,
    orderingKey,
    event: event.name,
  });

  try {
    await topicHandle.publishMessage(message);
  } catch (err) {
    // When a publish fails for an ordered key, the SDK halts subsequent
    // publishes for that key until resumePublishing is called. Resume
    // immediately so the next event for the same key is not blocked.
    if (orderingKey) {
      try {
        topicHandle.resumePublishing(orderingKey);
      } catch (resumeErr) {
        logger.debug('Pub/Sub resumePublishing failed', {
          orderingKey,
          error:
            resumeErr instanceof Error ? resumeErr.message : String(resumeErr),
        });
      }
    }

    if (isNotFound(err)) {
      logger.error(
        `Pub/Sub topic "${topicName}" not found in project "${projectId}". ` +
          `Run "walkeros setup destination.${id}" to create it.`,
        {
          topic: topicName,
          projectId,
          error: err instanceof Error ? err.message : String(err),
        },
      );
    } else if (isPermissionError(err)) {
      logger.error(
        `Pub/Sub publish denied for topic "${topicName}". Grant the runtime ` +
          `service account roles/pubsub.publisher on this topic.`,
        {
          topic: topicName,
          projectId,
          error: err instanceof Error ? err.message : String(err),
        },
      );
    } else {
      logger.error('Pub/Sub publish failed', {
        topic: topicName,
        projectId,
        event: event.name,
        error: err instanceof Error ? err.message : String(err),
      });
    }
    throw err;
  }
};
