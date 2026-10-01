import type { PushFn, Mapping } from './types';
import type { Mapping as WalkerOSMapping, Collector } from '@walkeros/core';
import { PublishCommand } from '@aws-sdk/client-sns';
import { getMappingValue, isObject } from '@walkeros/core';
import { resolveSettings } from './config';
import type { DeliveryTarget } from '../lib/errors';
import { fromSdkError, localError } from '../lib/errors';
import { toPayload } from '../lib/payload';

interface MessageAttribute {
  DataType: string;
  StringValue?: string;
  BinaryValue?: Uint8Array;
}

function isMessageAttribute(value: unknown): value is MessageAttribute {
  return isObject(value) && typeof value.DataType === 'string';
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

/**
 * Publishes one event. Resolves once SNS accepted the message, else throws an
 * `AwsDeliveryError`; the collector logs it, so SNS logs no error of its own.
 */
export const push: PushFn = async function (event, context) {
  const { config, data, env, rule, collector, logger, id } = context;
  const settings = resolveSettings(config.settings);
  const { runtime } = settings;

  // Tracked, so destroy waits for a first-publish account lookup too.
  const topicArn = await runtime.inflight.track(runtime.topicArn());
  const target: DeliveryTarget = {
    service: 'SNS',
    resource: topicArn,
    region: settings.region,
    id,
  };

  const ruleSettings: Mapping = isMapping(rule?.settings) ? rule.settings : {};

  const messageGroupId =
    ruleSettings.messageGroupId !== undefined
      ? await resolveStringMappingValue(
          event,
          ruleSettings.messageGroupId,
          collector,
        )
      : undefined;

  const fifo = topicArn.endsWith('.fifo');
  const mappedDeduplicationId =
    ruleSettings.messageDeduplicationId !== undefined
      ? await resolveStringMappingValue(
          event,
          ruleSettings.messageDeduplicationId,
          collector,
        )
      : undefined;
  // The event id is the dedup key everywhere, so a FIFO topic gets it unless
  // a rule maps its own.
  const messageDeduplicationId =
    mappedDeduplicationId ?? (fifo && event.id ? event.id : undefined);

  const messageAttributes = await resolveMessageAttributes(
    event,
    ruleSettings.messageAttributes,
    collector,
  );

  let message: string;
  try {
    message = JSON.stringify(toPayload(event, data));
  } catch (error) {
    throw localError(
      target,
      'InvalidRecord',
      `The message does not serialize to JSON: ${error instanceof Error ? error.message : String(error)}`,
      error,
    );
  }

  const input: {
    TopicArn: string;
    Message: string;
    MessageGroupId?: string;
    MessageDeduplicationId?: string;
    MessageAttributes?: Record<string, MessageAttribute>;
  } = { TopicArn: topicArn, Message: message };
  if (messageGroupId) input.MessageGroupId = messageGroupId;
  if (messageDeduplicationId)
    input.MessageDeduplicationId = messageDeduplicationId;
  if (messageAttributes) input.MessageAttributes = messageAttributes;

  const Command = env?.AWS?.PublishCommand ?? PublishCommand;
  const started = Date.now();
  let attempts: number | undefined;
  try {
    const response = await runtime.inflight.track(
      settings.client.send(new Command(input)),
    );
    attempts = readAttempts(response);
  } catch (error) {
    attempts = readAttempts(error);
    throw fromSdkError(error, target);
  } finally {
    logger.debug('SNS Publish', {
      topicArn,
      fifo,
      event: event.name,
      attempts,
      ms: Date.now() - started,
    });
  }
};

function readAttempts(value: unknown): number | undefined {
  if (typeof value !== 'object' || value === null || !('$metadata' in value))
    return undefined;
  const metadata = value.$metadata;
  if (typeof metadata !== 'object' || metadata === null) return undefined;
  return 'attempts' in metadata && typeof metadata.attempts === 'number'
    ? metadata.attempts
    : undefined;
}
