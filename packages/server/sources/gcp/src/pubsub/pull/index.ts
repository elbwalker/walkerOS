import type { Source } from '@walkeros/core';
import type { Settings, Types } from './types';
import type { MessageLike, SubscriptionLike } from '../shared/types';
import { decodeMessage, DecoderError } from '../shared/decoder';
import { getConfig } from './config';
import { setup } from './setup';

const PERMISSION_DENIED_GRPC = 7;
const NOT_FOUND_GRPC = 5;
const UNAUTHENTICATED_GRPC = 16;

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

/**
 * Google Cloud Pub/Sub pull source.
 *
 * Long-running streaming subscriber. `init()` opens the subscription stream
 * and forwards each message to the collector via `env.push`. The source's
 * `push` is a deliberate no-op (Pub/Sub is event-driven, not request-driven).
 * `destroy()` closes the subscriber gracefully, honoring `shutdownTimeoutMs`.
 */
export const sourcePubSubPull: Source.Init<Types> = async (context) => {
  const { config: partialConfig = {}, env, logger, id } = context;
  const config = getConfig(partialConfig, env, logger);
  const settings: Settings = config.settings;

  // Acquire subscription handle from the resolved client.
  const subscription: SubscriptionLike = settings.client.subscription(
    settings.subscription,
    {
      flowControl: settings.flowControl,
      ackDeadline: settings.ackDeadline,
    },
  );
  settings.subscriptionHandle = subscription;

  // Wire message handler. Decoded events are forwarded to the collector
  // via env.push; ack on success, nack (or ack-and-drop) on error per
  // settings.onPushError.
  subscription.on('message', async (message: MessageLike) => {
    try {
      const decoded = decodeMessage(message, settings.decoder ?? 'json');
      if (decoded === null || decoded === undefined) {
        logger.debug(
          'Pub/Sub message acked-and-dropped (decoder returned null)',
          { id: message.id },
        );
        message.ack();
        return;
      }
      await env.push(decoded);
      message.ack();
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      if (err instanceof DecoderError) {
        logger.error('Pub/Sub message decode failed', {
          id: message.id,
          error,
        });
      } else {
        logger.error('Pub/Sub message handler failed', {
          id: message.id,
          error,
        });
      }
      if (settings.onPushError === 'ack') message.ack();
      else message.nack();
    }
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
    push: async () => {
      // No-op: pull source is event-driven. Documented stub.
    },
    destroy: async () => {
      const subToClose = settings.subscriptionHandle;
      if (!subToClose) return;
      const timeoutMs = settings.shutdownTimeoutMs ?? 30000;
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
