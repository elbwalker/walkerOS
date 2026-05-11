import {
  DeleteMessageCommand,
  GetQueueAttributesCommand,
  GetQueueUrlCommand,
  ReceiveMessageCommand,
  SQSClient,
} from '@aws-sdk/client-sqs';
import type { Collector, Logger, Source, WalkerOS } from '@walkeros/core';
import type {
  Settings,
  SyntheticMessage,
  SyntheticPushResult,
  Types,
} from './types';
import { decodeBody, DecoderError } from './decoder';
import { getConfig } from './config';
import { setup } from './setup';

export { setup } from './setup';

const DEFAULT_SHUTDOWN_TIMEOUT_MS = 30000;
const RECEIVE_RETRY_BACKOFF_MS = 1000;

interface MessageDispatch {
  id: string;
  body: string;
  receiptHandle?: string;
  ack(): Promise<void>;
  nack(): Promise<void>;
}

function toDeepPartialEvent(value: unknown): WalkerOS.DeepPartialEvent {
  if (typeof value === 'object' && value !== null) {
    // Plain object payloads pass through. The collector treats them as
    // DeepPartialEvent shapes; downstream transformers see the same data.
    return value as WalkerOS.DeepPartialEvent;
  }
  if (typeof value === 'string') return { data: { payload: value } };
  if (Buffer.isBuffer(value))
    return { data: { payload: value.toString('base64') } };
  return { data: { payload: String(value) } };
}

async function handleMessage(args: {
  message: MessageDispatch;
  settings: Settings;
  pushFn: Collector.PushFn;
  logger: Logger.Instance;
}): Promise<void> {
  const { message, settings, pushFn, logger } = args;
  try {
    const decoded = decodeBody(
      message.id,
      message.body,
      settings.decoder ?? 'json',
    );
    if (decoded === null || decoded === undefined) {
      logger.debug('SQS message acked-and-dropped (decoder returned null)', {
        id: message.id,
      });
      await message.ack();
      return;
    }
    await pushFn(toDeepPartialEvent(decoded));
    await message.ack();
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    if (err instanceof DecoderError) {
      logger.error('SQS message decode failed', { id: message.id, error });
    } else {
      logger.error('SQS message handler failed', { id: message.id, error });
    }
    if (settings.onPushError === 'ack') await message.ack();
    else await message.nack();
  }
}

function isQueueDoesNotExist(err: unknown): boolean {
  if (typeof err !== 'object' || err === null) return false;
  if (!('name' in err)) return false;
  const obj: { name?: unknown } = err;
  return (
    obj.name === 'QueueDoesNotExist' ||
    obj.name === 'AWS.SimpleQueueService.NonExistentQueue'
  );
}

interface ClientWithDestroy {
  destroy?: () => void;
}

function tryDestroyClient(client: SQSClient, logger: Logger.Instance): void {
  // SQSClient implements destroy() in modern SDK versions; older versions
  // do not. Wrap defensively.
  const candidate: ClientWithDestroy = client;
  if (typeof candidate.destroy !== 'function') return;
  try {
    candidate.destroy();
  } catch (err) {
    logger.debug('SQS client destroy failed (non-fatal)', {
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

interface FetchedMessage {
  MessageId: string;
  ReceiptHandle: string;
  Body: string;
}

function isFetchedMessage(value: unknown): value is FetchedMessage {
  if (typeof value !== 'object' || value === null) return false;
  const obj: {
    MessageId?: unknown;
    ReceiptHandle?: unknown;
    Body?: unknown;
  } = value;
  return (
    typeof obj.MessageId === 'string' &&
    typeof obj.ReceiptHandle === 'string' &&
    typeof obj.Body === 'string'
  );
}

/**
 * AWS SQS source.
 *
 * Long-running poll-and-forward subscriber. init() validates the queue exists,
 * captures the canonical queueUrl, and starts the long-poll loop as a
 * background task. push() accepts an optional synthetic message (used by
 * tests / triggers) and dispatches it through the same handler the loop uses;
 * called without arguments (production) it is a no-op since SQS is event-driven.
 *
 * destroy() stops the loop, drains in-flight handlers, and force-closes after
 * shutdownTimeoutMs (default 30000).
 */
export const sourceSqs: Source.Init<Types> = async (context) => {
  const { config: partialConfig = {}, env, logger, id } = context;
  const config = getConfig(partialConfig, env, logger);
  const settings: Settings = config.settings;

  // Resolve queueUrl from queueName at init time.
  if (!settings.queueUrl) {
    try {
      const res = await settings.client.send(
        new GetQueueUrlCommand({ QueueName: settings.queueName }),
      );
      if (!res.QueueUrl) {
        return logger.throw(
          `SQS queue not found: ${settings.queueName}. ` +
            `Run "walkeros setup source.${id}" to create it.`,
        );
      }
      settings.queueUrl = res.QueueUrl;
    } catch (err) {
      if (isQueueDoesNotExist(err)) {
        return logger.throw(
          `SQS queue not found: ${settings.queueName}. ` +
            `Run "walkeros setup source.${id}" to create it.`,
        );
      }
      throw err;
    }
  }

  // Capture queueArn for downstream use (e.g. SNS subscription verification).
  if (!settings.queueArn) {
    try {
      const res = await settings.client.send(
        new GetQueueAttributesCommand({
          QueueUrl: settings.queueUrl,
          AttributeNames: ['QueueArn'],
        }),
      );
      settings.queueArn = res.Attributes?.QueueArn;
    } catch (err) {
      // ARN is informational; continue without it.
      logger.debug('SQS GetQueueAttributesCommand failed (non-fatal)', {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // Long-poll loop control flag and in-flight tracker.
  let stopped = false;
  const inFlight = new Set<Promise<void>>();

  const loop = async (): Promise<void> => {
    while (!stopped) {
      try {
        const res = await settings.client.send(
          new ReceiveMessageCommand({
            QueueUrl: settings.queueUrl,
            MaxNumberOfMessages: settings.maxMessages ?? 10,
            WaitTimeSeconds: settings.waitTimeSeconds ?? 20,
            VisibilityTimeout: settings.visibilityTimeout,
            MessageAttributeNames: ['All'],
            AttributeNames: ['All'],
          }),
        );
        const messages = res.Messages ?? [];
        for (const msg of messages) {
          if (!isFetchedMessage(msg)) {
            logger.warn('SQS received malformed message; skipping', {
              messageId:
                typeof msg.MessageId === 'string' ? msg.MessageId : undefined,
            });
            continue;
          }
          const fetched: FetchedMessage = msg;
          const dispatch: MessageDispatch = {
            id: fetched.MessageId,
            body: fetched.Body,
            receiptHandle: fetched.ReceiptHandle,
            ack: async () => {
              await settings.client.send(
                new DeleteMessageCommand({
                  QueueUrl: settings.queueUrl ?? '',
                  ReceiptHandle: fetched.ReceiptHandle,
                }),
              );
            },
            nack: async () => {
              // SQS has no explicit nack: skipping DeleteMessage causes
              // redelivery after VisibilityTimeout expires.
            },
          };
          const handler = handleMessage({
            message: dispatch,
            settings,
            pushFn: env.push,
            logger,
          });
          inFlight.add(handler);
          handler.finally(() => {
            inFlight.delete(handler);
          });
        }
      } catch (err) {
        if (stopped) break;
        const error = err instanceof Error ? err.message : String(err);
        if (isQueueDoesNotExist(err)) {
          logger.error(
            `SQS queue "${settings.queueName}" not found at runtime. ` +
              `Run "walkeros setup source.${id}" to create it. Original: ${error}`,
          );
          // Stop the loop on a fatal error; operator must intervene.
          stopped = true;
          break;
        }
        logger.error('SQS receive error (will retry)', { error });
        // Backoff before retry to avoid tight-looping on persistent errors.
        await new Promise((r) => setTimeout(r, RECEIVE_RETRY_BACKOFF_MS));
      }
    }
  };

  // Launch the loop without awaiting so init returns immediately. Track the
  // promise so destroy() can await it before resolving (prevents leaked
  // timers in test runs).
  const loopPromise = loop();

  return {
    type: 'sqs',
    config,
    setup,
    push: async (
      content?: SyntheticMessage,
    ): Promise<SyntheticPushResult | void> => {
      if (!content) return;
      const result: SyntheticPushResult = { acked: false, nacked: false };
      await handleMessage({
        message: {
          id: content.MessageId,
          body: content.Body,
          receiptHandle: content.ReceiptHandle,
          ack: async () => {
            result.acked = true;
          },
          nack: async () => {
            result.nacked = true;
          },
        },
        settings,
        pushFn: env.push,
        logger,
      });
      return result;
    },
    destroy: async () => {
      stopped = true;
      const timeoutMs =
        settings.shutdownTimeoutMs ?? DEFAULT_SHUTDOWN_TIMEOUT_MS;
      let timer: NodeJS.Timeout | undefined;
      try {
        await Promise.race([
          (async () => {
            // Wait for the loop to exit AND in-flight handlers to drain.
            await loopPromise;
            await Promise.all(Array.from(inFlight));
          })(),
          new Promise<void>((resolve) => {
            timer = setTimeout(() => {
              logger.warn(
                `SQS source close timed out after ${timeoutMs}ms; forcing close.`,
              );
              resolve();
            }, timeoutMs);
          }),
        ]);
      } finally {
        if (timer) clearTimeout(timer);
        tryDestroyClient(settings.client, logger);
      }
    },
  };
};

export default sourceSqs;
