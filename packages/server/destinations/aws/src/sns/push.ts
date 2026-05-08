import type { PushFn, Mapping } from './types';
import type { Mapping as WalkerOSMapping, Collector } from '@walkeros/core';
import { getMappingValue, isObject } from '@walkeros/core';
import { isAWSEnvironment } from './lib/sns';

interface MessageAttribute {
  DataType: string;
  StringValue?: string;
  BinaryValue?: Uint8Array;
}

function isMessageAttribute(value: unknown): value is MessageAttribute {
  if (!isObject(value)) return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.DataType === 'string';
}

async function resolveMessageAttributes(
  event: Parameters<PushFn>[0],
  source: WalkerOSMapping.Map | undefined,
  collector: Collector.Instance,
): Promise<Record<string, MessageAttribute> | undefined> {
  if (!source) return undefined;
  const result: Record<string, MessageAttribute> = {};
  let touched = false;
  for (const [key, value] of Object.entries(source)) {
    const resolved = await getMappingValue(event, value, { collector });
    if (isMessageAttribute(resolved)) {
      result[key] = resolved;
      touched = true;
    } else if (typeof resolved === 'string' && resolved.length > 0) {
      // Bare-string convenience: wrap into String DataType.
      result[key] = { DataType: 'String', StringValue: resolved };
      touched = true;
    } else if (resolved !== undefined && resolved !== null) {
      result[key] = { DataType: 'String', StringValue: String(resolved) };
      touched = true;
    }
  }
  return touched ? result : undefined;
}

function isMapping(value: unknown): value is Mapping {
  return typeof value === 'object' && value !== null;
}

async function resolveStringMappingValue(
  event: Parameters<PushFn>[0],
  value: WalkerOSMapping.Value,
  collector: Collector.Instance,
): Promise<string | undefined> {
  const resolved = await getMappingValue(event, value, { collector });
  if (typeof resolved === 'string' && resolved.length > 0) return resolved;
  if (resolved === undefined || resolved === null) return undefined;
  return String(resolved);
}

export const push: PushFn = async function (event, context) {
  const { config, env, rule, collector, logger, id } = context;
  const settings = config.settings;
  const client = settings?.client;
  const topicArn = settings?.topicArn;

  if (!client) return logger.throw('SNS push: client missing, init() not run');
  if (!topicArn)
    return logger.throw('SNS push: topicArn missing, init() not run');
  if (!isAWSEnvironment(env))
    return logger.throw('SNS push: env.AWS not injected');

  const ruleSettings: Mapping = isMapping(rule?.settings) ? rule.settings : {};

  let messageGroupId: string | undefined;
  if (ruleSettings.messageGroupId !== undefined) {
    messageGroupId = await resolveStringMappingValue(
      event,
      ruleSettings.messageGroupId,
      collector,
    );
  }

  let messageDeduplicationId: string | undefined;
  if (ruleSettings.messageDeduplicationId !== undefined) {
    messageDeduplicationId = await resolveStringMappingValue(
      event,
      ruleSettings.messageDeduplicationId,
      collector,
    );
  }

  const messageAttributes = await resolveMessageAttributes(
    event,
    ruleSettings.messageAttributes,
    collector,
  );

  const input: {
    TopicArn: string;
    Message: string;
    MessageGroupId?: string;
    MessageDeduplicationId?: string;
    MessageAttributes?: Record<string, MessageAttribute>;
  } = {
    TopicArn: topicArn,
    Message: JSON.stringify(event),
  };
  if (messageGroupId) input.MessageGroupId = messageGroupId;
  if (messageDeduplicationId)
    input.MessageDeduplicationId = messageDeduplicationId;
  if (messageAttributes) input.MessageAttributes = messageAttributes;

  logger.debug('SNS Publish', {
    topicArn,
    fifo: topicArn.endsWith('.fifo'),
    event: event.name,
  });

  try {
    await client.send(new env.AWS.PublishCommand(input));
  } catch (err) {
    logger.error(
      `SNS Publish failed for "${topicArn}". ` +
        `Run "walkeros setup destination.${id}" if the topic is missing.`,
      {
        topicArn,
        event: event.name,
        error: err instanceof Error ? err.message : String(err),
      },
    );
    throw err;
  }
};
