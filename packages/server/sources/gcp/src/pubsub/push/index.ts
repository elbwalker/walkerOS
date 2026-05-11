import type { Source } from '@walkeros/core';
import { isObject } from '@walkeros/core';
import { decodeMessage, DecoderError } from '../shared/decoder';
import type { DecodableMessage } from '../shared/decoder';
import { getConfig } from './config';
import type { Env, PushEnvelope, Request, Response, Types } from './types';

function isPushEnvelope(value: unknown): value is PushEnvelope {
  if (!isObject(value)) return false;
  const candidate: { message?: unknown; subscription?: unknown } = value;
  if (!isObject(candidate.message)) return false;
  const msg: { messageId?: unknown; data?: unknown } = candidate.message;
  return typeof msg.messageId === 'string';
}

function extractBearerToken(req: Request): string | undefined {
  const auth = req.headers['authorization'];
  const value = Array.isArray(auth) ? auth[0] : auth;
  if (!value) return undefined;
  if (!value.startsWith('Bearer ')) return undefined;
  return value.slice('Bearer '.length).trim();
}

interface OAuth2ClientLike {
  verifyIdToken(opts: {
    idToken: string;
    audience: string;
  }): Promise<{ getPayload(): unknown }>;
}

interface OAuth2ClientCtor {
  new (): OAuth2ClientLike;
}

async function maybeVerifyOidc(
  req: Request,
  env: Env,
  audience: string,
): Promise<boolean> {
  const token = extractBearerToken(req);
  if (!token) return false;
  if (!env.verifyOidcToken) {
    // Real SDK path: dynamically require google-auth-library so consumers
    // who never use OIDC do not pay the cost of pulling it into the bundle.
    // Static import would force every push-source bundle to include it.
    const lib: {
      OAuth2Client: OAuth2ClientCtor;
    } = require('google-auth-library');
    const client: OAuth2ClientLike = new lib.OAuth2Client();
    const ticket = await client.verifyIdToken({ idToken: token, audience });
    const payload = ticket.getPayload();
    return Boolean(payload);
  }
  const payload = await env.verifyOidcToken(token, audience);
  return Boolean(payload);
}

/**
 * Google Cloud Pub/Sub push source.
 *
 * HTTP request handler. Pub/Sub POSTs each message envelope to the operator's
 * endpoint; this source decodes the envelope, base64-decodes the data field,
 * runs the configured decoder, and forwards the decoded value to the
 * collector via env.push.
 */
export const sourcePubSubPush: Source.Init<Types> = async (context) => {
  const { config: partialConfig = {}, env, logger } = context;
  const config = getConfig(partialConfig, logger);
  const settings = config.settings;
  if (!settings)
    return logger.throw('settings missing after getConfig (impossible)');

  const handlePush = async (req: Request, res: Response): Promise<void> => {
    try {
      if (req.method !== 'POST') {
        res.status(405).json({
          success: false,
          error: 'Method not allowed. Use POST.',
        });
        return;
      }

      if (settings.verifyOidc) {
        const audience = settings.audience;
        if (!audience) {
          logger.error(
            'Pub/Sub push: verifyOidc is true but audience is unset',
          );
          res.status(500).json({
            success: false,
            error: 'Server misconfiguration: OIDC audience missing.',
          });
          return;
        }
        let verified = false;
        try {
          verified = await maybeVerifyOidc(req, env, audience);
        } catch (err) {
          logger.warn('Pub/Sub push: OIDC verification failed', {
            error: err instanceof Error ? err.message : String(err),
          });
          verified = false;
        }
        if (!verified) {
          res.status(401).json({
            success: false,
            error: 'Unauthorized: OIDC token verification failed.',
          });
          return;
        }
      }

      let body: unknown = req.body;
      if (typeof body === 'string') {
        try {
          body = JSON.parse(body);
        } catch {
          res.status(400).json({
            success: false,
            error: 'Malformed Pub/Sub envelope (invalid JSON body).',
          });
          return;
        }
      }

      if (!isPushEnvelope(body)) {
        res.status(400).json({
          success: false,
          error: 'Malformed Pub/Sub envelope (missing message.messageId).',
        });
        return;
      }

      const dataBase64 = body.message.data;
      const dataBuffer = dataBase64
        ? Buffer.from(dataBase64, 'base64')
        : Buffer.alloc(0);

      const decoder = settings.decoder ?? 'json';
      const message: DecodableMessage = {
        id: body.message.messageId,
        data: dataBuffer,
      };

      let decoded: unknown;
      try {
        decoded = decodeMessage(message, decoder);
      } catch (err) {
        if (err instanceof DecoderError) {
          res.status(400).json({
            success: false,
            error: err.message,
          });
          return;
        }
        throw err;
      }

      if (decoded === null || decoded === undefined) {
        res.status(200).json({ success: true, dropped: true });
        return;
      }

      await env.push(decoded);
      res.status(200).json({ success: true, id: body.message.messageId });
    } catch (error) {
      logger.error('Pub/Sub push handler failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      });
    }
  };

  return {
    type: 'pubsub-push',
    config,
    push: handlePush,
  };
};

export default sourcePubSubPush;
