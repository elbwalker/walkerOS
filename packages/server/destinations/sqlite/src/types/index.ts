import type {
  Mapping as WalkerOSMapping,
  Destination as CoreDestination,
} from '@walkeros/core';
import type { DestinationServer } from '@walkeros/server-core';

export type SchemaMode = 'auto' | 'manual';

/**
 * Thin cross-driver connection interface. Both drivers are adapted to this shape.
 * Production code uses the adapters in src/drivers/*; tests inject a mock client
 * via env.client to capture sql/args without touching a real database.
 */
export interface SqliteClient {
  /** Execute a SQL statement. Used for CREATE TABLE and ad-hoc commands. */
  execute: (sql: string, args?: ReadonlyArray<unknown>) => Promise<void>;
  /**
   * Prepare a statement for repeated execution. Returned function binds args and runs.
   */
  prepare: (sql: string) => (args: ReadonlyArray<unknown>) => Promise<void>;
  /** Close the connection. */
  close: () => Promise<void>;
}

/**
 * Factory that constructs an SqliteClient from the user's connection settings.
 * Used by env.SqliteDriver so tests can inject a spy without mocking node_modules.
 */
export type SqliteClientFactory = (
  url: string,
  authToken?: string,
) => Promise<SqliteClient>;

export interface SqliteSettings {
  /**
   * Connection URL. Starts with `libsql://`, `http://`, `https://`, `wss://`, `ws://`
   * → libSQL driver. Anything else → better-sqlite3 (treated as a file path).
   * Special value `:memory:` → in-memory (better-sqlite3).
   */
  url: string;
  /** libSQL / Turso auth token. Ignored for better-sqlite3. */
  authToken?: string;
  /** Target table name. Defaults to `events`. */
  table?: string;
  /**
   * `auto` runs `CREATE TABLE IF NOT EXISTS` with the canonical schema on init.
   * `manual` skips CREATE TABLE. The user brings their own schema and mapping.
   * Defaults to `auto`.
   */
  schema?: SchemaMode;

  // Runtime -- set during init, not user-facing.
  _client?: SqliteClient;
  _runInsert?: (args: ReadonlyArray<unknown>) => Promise<void>;
  _ownedClient?: boolean;
}

export interface Settings {
  sqlite: SqliteSettings;
}

export type InitSettings = Partial<Settings>;

export interface Mapping {
  /** Override target table for this rule. */
  table?: string;
}

/**
 * Env -- optional driver override. Production leaves this undefined and the
 * destination loads better-sqlite3 or @libsql/client dynamically. Tests
 * provide a factory via `SqliteDriver` or a pre-built client via `client`.
 */
export interface Env extends DestinationServer.Env {
  SqliteDriver?: SqliteClientFactory;
  client?: SqliteClient;
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

export type Rule = WalkerOSMapping.Rule<Mapping>;
export type Rules = WalkerOSMapping.Rules<Rule>;
