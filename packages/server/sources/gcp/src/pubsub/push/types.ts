import type { Source as CoreSource } from '@walkeros/core';
import type { Decoder } from '../shared/types';

declare module '@walkeros/core' {
  interface SourceMap {
    'pubsub-push': { type: 'pubsub-push'; platform: 'server' };
  }
}

/**
 * Minimal request shape for the push handler. Mirrors the cloudfunction
 * source so operators can wire `sourcePubSubPush` into express, lambda,
 * or any framework that delivers a similar contract.
 */
export interface Request {
  method: string;
  body?: unknown;
  headers: Record<string, string | string[]>;
  get(name: string): string | undefined;
}

export interface Response {
  status(code: number): Response;
  json(body: unknown): Response;
  send(body?: unknown): Response;
  set(key: string, value: string): Response;
}

export interface Settings {
  /** GCP project id. Optional; informational, used in error messages. */
  projectId?: string;
  /** Decoder for the message data field. Default: 'json'. */
  decoder?: Decoder;
  /** Verify the OIDC bearer token Pub/Sub attaches to push requests. Default: false. */
  verifyOidc?: boolean;
  /** OIDC audience (your endpoint URL or a custom audience). Required if verifyOidc is true. */
  audience?: string;
}

export type InitSettings = Partial<Settings>;

export interface Mapping {
  // Reserved for future use.
}

export type Push = (req: Request, res: Response) => Promise<void>;

export interface Env extends CoreSource.Env {
  req?: Request;
  res?: Response;
  /** Optional override for OIDC verification. Tests can inject a stub. */
  verifyOidcToken?: (
    token: string,
    audience: string,
  ) => Promise<{ sub?: string; email?: string }>;
}

export type Types = CoreSource.Types<
  Settings,
  Mapping,
  Push,
  Env,
  InitSettings
>;

export type Config = CoreSource.Config<Types>;
export type PartialConfig = CoreSource.PartialConfig<Types>;

/**
 * Pub/Sub push envelope shape. Pub/Sub POSTs each message in this format
 * to the configured push endpoint. `data` is base64-encoded.
 */
export interface PushEnvelope {
  message: {
    data?: string;
    attributes?: Record<string, string>;
    messageId: string;
    publishTime?: string;
    orderingKey?: string;
  };
  subscription: string;
}
