import type { Collector, Logger, Source, WalkerOS } from '@walkeros/core';
import type {
  Message,
  Subscription,
  SubscriptionOptions,
} from '@google-cloud/pubsub';
import { Duration } from '@google-cloud/pubsub';
import type {
  Settings,
  SyntheticMessage,
  SyntheticPushResult,
  Types,
} from './types';
import { decodeMessage, DecoderError } from '../shared/decoder';
import { getConfig } from './config';
import { setup } from './setup';

const PERMISSION_DENIED_GRPC = 7;
const NOT_FOUND_GRPC = 5;
const UNAUTHENTICATED_GRPC = 16;
const DEFAULT_SHUTDOWN_TIMEOUT_MS = 30000;

interface ErrorWithCode {
  code: number;
}

function hasNumericCode(err: unknown): err is ErrorWithCode {
  if (typeof err !== 'object' || err === null) return false;
  if (!('code' in err)) return false;
  const obj: { code?: unknown } = err;
  return typeof obj.code === 'number';
}

function isSubscriptionNotFound(err: unknown): boolean {
  return hasNumericCode(err) && err.code === NOT_FOUND_GRPC;
}

function isPermissionDenied(err: unknown): boolean {
  return (
    hasNumericCode(err) &&
    (err.code === PERMISSION_DENIED_GRPC || err.code === UNAUTHENTICATED_GRPC)
  );
}

interface MessageDispatch {
  id: string;
  data: Buffer;
  ack(): void;
  nack(): void;
}

/**
 * Core message-handling pipeline. The SDK's `'message'` listener and the
 * source's synthetic `push()` both funnel through here, so production and
 * test paths share the same decode / forward / ack-nack semantics.
 */
function toDeepPartialEvent(value: unknown): WalkerOS.DeepPartialEvent {
  // The decoder may return a plain object (json), a string (text), or a
  // Buffer (raw). The collector's push accepts DeepPartialEvent shapes;
  // object payloads pass through as-is. Non-object payloads (string/Buffer)
  // are wrapped so the collector / downstream transformers see them under
  // `data.payload` while the type contract on `data` (Property values) holds.
  if (typeof value === 'object' && value !== null) return value;
  if (typeof value === 'string') {
    return { data: { payload: value } };
  }
  if (Buffer.isBuffer(value)) {
    return { data: { payload: value.toString('base64') } };
  }
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
    const decoded = decodeMessage(message, settings.decoder ?? 'json');
    if (decoded === null || decoded === undefined) {
      logger.debug(
        'Pub/Sub message acked-and-dropped (decoder returned null)',
        {
          id: message.id,
        },
      );
      message.ack();
      return;
    }
    await pushFn(toDeepPartialEvent(decoded));
    message.ack();
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    if (err instanceof DecoderError) {
      logger.error('Pub/Sub message decode failed', { id: message.id, error });
    } else {
      logger.error('Pub/Sub message handler failed', { id: message.id, error });
    }
    if (settings.onPushError === 'ack') message.ack();
    else message.nack();
  }
}

/**
 * Google Cloud Pub/Sub pull source.
 *
 * Long-running streaming subscriber. `init()` opens the subscription stream
 * and forwards each message to the collector via `env.push`. The source's
 * `push` accepts an optional synthetic message (used by tests / triggers)
 * and dispatches it through the same pipeline; called without arguments
 * (production) it is a no-op since Pub/Sub is event-driven.
 *
 * `destroy()` closes the subscriber gracefully, honoring `shutdownTimeoutMs`.
 */
export const sourcePubSubPull: Source.Init<Types> = async (context) => {
  const { config: partialConfig = {}, env, logger, id } = context;
  const config = getConfig(partialConfig, env, logger);
  const settings: Settings = config.settings;

  // Acquire subscription handle from the resolved client.
  const subscriptionOptions: SubscriptionOptions = {
    flowControl: settings.flowControl,
  };
  if (typeof settings.ackDeadline === 'number') {
    // Map our seconds-based setting onto the SDK's typed Duration field.
    subscriptionOptions.maxAckDeadline = Duration.from({
      seconds: settings.ackDeadline,
    });
  }
  const subscription: Subscription = settings.client.subscription(
    settings.subscription,
    subscriptionOptions,
  );
  settings.subscriptionHandle = subscription;

  // Wire message handler. Decoded events are forwarded to the collector
  // via env.push; ack on success, nack (or ack-and-drop) on error per
  // settings.onPushError.
  subscription.on('message', async (message: Message) => {
    await handleMessage({
      message: {
        id: message.id,
        data: message.data,
        ack: () => message.ack(),
        nack: () => message.nack(),
      },
      settings,
      pushFn: env.push,
      logger,
    });
  });

  // Wire stream-error handler (NOT per-message). The SDK reconnects with
  // backoff on transient errors; we surface fatal ones with an actionable
  // hint so operators know to run setup.
  subscription.on('error', (err: Error) => {
    if (isPermissionDenied(err) || isSubscriptionNotFound(err)) {
      logger.error(
        `Pub/Sub subscription "${settings.subscription}" not found or unauthorized in project "${settings.projectId}". ` +
          `Run "walkeros setup source.${id}" to create it. Original: ${err.message}`,
      );
    } else {
      logger.error('Pub/Sub subscription stream error (SDK will retry)', {
        error: err.message,
      });
    }
  });

  return {
    type: 'pubsub-pull',
    config,
    setup,
    push: async (
      content?: SyntheticMessage,
    ): Promise<SyntheticPushResult | void> => {
      if (!content) return;
      // Synthetic dispatch: route through the same pipeline the SDK uses.
      const result: SyntheticPushResult = { acked: false, nacked: false };
      await handleMessage({
        message: {
          id: content.id,
          data: content.data,
          ack: () => {
            result.acked = true;
          },
          nack: () => {
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
      const subToClose = settings.subscriptionHandle;
      if (!subToClose) return;
      const timeoutMs =
        settings.shutdownTimeoutMs ?? DEFAULT_SHUTDOWN_TIMEOUT_MS;
      try {
        await Promise.race([
          subToClose.close(),
          new Promise<void>((resolve) =>
            setTimeout(() => {
              logger.warn(
                `Pub/Sub subscriber close timed out after ${timeoutMs}ms; forcing close.`,
              );
              resolve();
            }, timeoutMs),
          ),
        ]);
      } finally {
        if (settings.client) {
          await settings.client.close().catch(() => undefined);
        }
      }
    },
  };
};

export default sourcePubSubPull;
