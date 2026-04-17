import type { Destination as CoreDestination } from '@walkeros/core';
import type { DestinationServer } from '@walkeros/server-core';

/**
 * Arguments passed to Redis XADD. Strings or numbers (for MAXLEN counts).
 */
export type XaddArg = string | number;

/**
 * Mock-friendly Redis pipeline interface. Accumulates commands and
 * executes them with a single round-trip via exec().
 */
export interface RedisPipelineMock {
  xadd: (...args: XaddArg[]) => RedisPipelineMock;
  exec: () => Promise<Array<[Error | null, unknown]> | null>;
}

/**
 * Mock-friendly Redis client interface used by the destination.
 * Tests provide this via env.Redis; production creates a real ioredis
 * client and uses it directly.
 */
export interface RedisClientMock {
  xadd: (...args: XaddArg[]) => Promise<string | null>;
  pipeline: () => RedisPipelineMock;
  quit: () => Promise<string>;
  on?: (event: string, listener: (...args: unknown[]) => void) => unknown;
}

/**
 * Constructor signature for the Redis client. Accepts either a URL
 * string or an options object, matching ioredis's dual signature.
 */
export interface RedisClientConstructor {
  new (url: string): RedisClientMock;
  new (options: RedisClientOptions): RedisClientMock;
}

/**
 * Minimal ioredis options subset the destination passes through.
 * Unknown options are preserved for the SDK to handle.
 */
export interface RedisClientOptions {
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  db?: number;
  tls?: boolean | Record<string, unknown>;
  connectTimeout?: number;
  commandTimeout?: number;
  [key: string]: unknown;
}

export type SerializationMode = 'json' | 'flat';

export interface RedisSettings {
  /** Redis stream key name (e.g. 'walkeros:events'). */
  streamKey: string;
  /** Redis connection URL (e.g. 'redis://localhost:6379' or 'rediss://...'). */
  url?: string;
  /** ioredis connection options (used if no url provided). */
  options?: RedisClientOptions;
  /**
   * Maximum stream length. Enables MAXLEN trimming on every XADD.
   * Uses approximate (~) trimming by default for performance.
   * Omit for unlimited stream length.
   */
  maxLen?: number;
  /**
   * Use exact MAXLEN instead of approximate (~).
   * Not recommended for production -- significantly slower.
   * Default: false (approximate trimming).
   */
  exactTrimming?: boolean;
  /**
   * Serialization mode for the event payload.
   * - 'json': Single 'event' field with JSON string (default)
   * - 'flat': Top-level event fields as separate stream fields
   */
  serialization?: SerializationMode;

  // Runtime -- set during init, not user-facing
  _client?: RedisClientMock;
  _ownedClient?: boolean;
}

export interface Settings {
  redis: RedisSettings;
}

export type InitSettings = Partial<Settings>;

export interface Mapping {
  /** Override stream key for this rule. */
  streamKey?: string;
}

/**
 * Env -- optional Redis SDK override. Production leaves this undefined
 * and the destination creates real ioredis client instances. Tests provide
 * mocks via env.Redis.
 */
export interface Env extends DestinationServer.Env {
  Redis?: {
    Client: RedisClientConstructor;
  };
}

export type Types = CoreDestination.Types<Settings, Mapping, Env, InitSettings>;

export interface Destination extends DestinationServer.Destination<Types> {
  init: DestinationServer.InitFn<Types>;
}

export type Config = {
  settings: Settings;
} & DestinationServer.Config<Types>;

export type InitFn = DestinationServer.InitFn<Types>;
export type PushFn = DestinationServer.PushFn<Types>;
export type PartialConfig = DestinationServer.PartialConfig<Types>;
export type PushEvents = DestinationServer.PushEvents<Mapping>;
