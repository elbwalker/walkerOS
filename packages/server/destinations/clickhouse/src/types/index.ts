import type { Destination as CoreDestination } from '@walkeros/core';
import type { DestinationServer } from '@walkeros/server-core';
import type {
  ClickHouseClient,
  ClickHouseClientConfigOptions,
  ClickHouseSettings,
} from '@clickhouse/client';

/**
 * The only two client methods this package is allowed to reach for. Narrowing
 * the seam to them makes the INSERT-only rule a compile-time property rather
 * than a convention: `query`, `command`, `exec` and `ping` are not reachable
 * from a client typed this way, so no code path can read `system.*` or issue
 * DDL. The SDK's own `createClient` stays assignable by structural typing.
 */
export type ClickHouseClientSurface = Pick<
  ClickHouseClient,
  'insert' | 'close'
>;

/** Creates the client this destination writes through. Matches `createClient`. */
export type ClickHouseClientFactory = (
  config: ClickHouseClientConfigOptions,
) => ClickHouseClientSurface;

/**
 * Resolved settings, as they exist after init() applied the defaults and
 * created the client. Every field is present.
 */
export interface Settings {
  /** ClickHouse HTTP endpoint, like https://host.clickhouse.cloud:8443. */
  url: string;
  /** Database holding the events table. */
  database: string;
  /** Table every event is inserted into. */
  table: string;
  /** Retries added on top of the first attempt: total attempts = 1 + maxRetries. */
  maxRetries: number;
  /** Raw @clickhouse/client options, merged into the created client. */
  clickhouse?: ClickHouseClientConfigOptions;
  /** ClickHouse settings applied to every insert. */
  clickhouseSettings?: ClickHouseSettings;
  /**
   * The live client created by init(). Carried on the resolved config so the
   * insert path receives it as part of its settings argument. Runtime-only,
   * not user-facing.
   */
  client: ClickHouseClientSurface;
}

/**
 * Settings as a user writes them in a flow. Only `url` is required; init()
 * fills the rest from the documented defaults.
 */
export interface InitSettings {
  /** ClickHouse HTTP endpoint, like https://host.clickhouse.cloud:8443. */
  url: string;
  /** Database holding the events table. Default `default`. */
  database?: string;
  /** Table every event is inserted into. Default `events`. */
  table?: string;
  /**
   * Retries added on top of the first attempt: total attempts = 1 + maxRetries.
   * Default 1, so two attempts.
   */
  maxRetries?: number;
  /** Raw @clickhouse/client options, merged into the created client. */
  clickhouse?: ClickHouseClientConfigOptions;
  /** ClickHouse settings applied to every insert. */
  clickhouseSettings?: ClickHouseSettings;
  /**
   * The live client, populated by init(). Runtime-only, not user-facing.
   *
   * Optional because this is the type a user writes. Core resolves
   * `Config.settings` from this slot, so the push path receives it optional
   * too and must guard before use (see `__tests__/schemas.test.ts`).
   */
  client?: ClickHouseClientSurface;
}

/**
 * ClickHouse receives raw events, so there is no event-level mapping
 * configuration to declare.
 */
export interface Mapping {}

/** Username and password for the ClickHouse user the destination writes as. */
export interface Credentials {
  username: string;
  password: string;
}

/**
 * Env carries the client factory so tests and simulations inject a recording
 * stand-in instead of opening a socket. Production leaves it undefined and the
 * destination uses the SDK's own `createClient`.
 */
export interface Env extends DestinationServer.Env {
  ClickHouseClient?: ClickHouseClientFactory;
}

/**
 * The setup slot stays `unknown`: this destination issues INSERT and nothing
 * else, so there is no provisioning lifecycle to configure.
 */
export type Types = CoreDestination.Types<
  Settings,
  Mapping,
  Env,
  InitSettings,
  unknown,
  Credentials
>;

/**
 * `pushBatch` is required, not optional: the collector engages batching only
 * when the destination exports it, and bulk inserts are the whole point of
 * this package. A build that drops it would silently insert row by row.
 */
export interface Destination extends DestinationServer.Destination<Types> {
  init: InitFn;
  pushBatch: PushBatchFn;
}

export type Config = {
  settings: Settings;
} & DestinationServer.Config<Types>;

export type InitFn = DestinationServer.InitFn<Types>;
export type PushFn = DestinationServer.PushFn<Types>;
export type PushBatchFn = CoreDestination.PushBatchFn<Types>;

export type PartialConfig = DestinationServer.PartialConfig<Types>;

export type PushEvents = DestinationServer.PushEvents<Mapping>;
