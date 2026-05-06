import type {
  Mapping as WalkerOSMapping,
  Destination as CoreDestination,
  SetupFn as CoreSetupFn,
} from '@walkeros/core';
import type { DestinationServer } from '@walkeros/server-core';

/**
 * @deprecated Use `config.setup` instead. Kept for one minor cycle.
 * `'auto'` maps to `setup: true`, `'manual'` maps to `setup: false`.
 * Removed in the next major.
 */
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
  /** Run a query that returns rows. Used by setup() for sqlite_master and PRAGMA table_info. */
  query: (
    sql: string,
    args?: ReadonlyArray<unknown>,
  ) => Promise<ReadonlyArray<Record<string, unknown>>>;
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
   * @deprecated Use `config.setup` instead. Kept for one minor cycle.
   * `'auto'` maps to `setup: true` (init runs CREATE TABLE for the legacy schema).
   * `'manual'` maps to `setup: false`. Removed in the next major.
   */
  schema?: SchemaMode;

  // Runtime, set during init/setup, not user-facing.
  _client?: SqliteClient;
  _runInsert?: (args: ReadonlyArray<unknown>) => Promise<void>;
  _ownedClient?: boolean;
  /**
   * Internal flag set by the migration shim. When true, init() runs the legacy
   * 13-column CREATE TABLE path for backward compatibility. Otherwise init()
   * assumes the table already exists (created via `walkeros setup destination.<id>`).
   */
  _legacyAutoCreate?: boolean;
  /**
   * Internal flag set by the migration shim. When true (legacy `schema: 'manual'`),
   * init() skips the modern table-existence probe so the user can bring their own
   * table and column shape without hitting the new "table not found" hard-fail.
   */
  _legacySkipProbe?: boolean;
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
 * Provisioning options for `walkeros setup destination.<name>`.
 * Triggered only by the explicit CLI command. Idempotent, never auto-run.
 *
 * Connection URL and target table are read from `settings.sqlite.url` and
 * `settings.sqlite.table` (single source of truth, not duplicated here).
 */
export interface Setup {
  /** Pragmas to apply at setup time. Defaults: journal_mode=WAL, synchronous=NORMAL, foreign_keys=ON, temp_store=MEMORY. */
  pragmas?: Record<string, string | number>;
  /** Schema columns. Default: 15-column walkerOS Event v4 canonical (only `name` REQUIRED). */
  schema?: SetupColumn[];
  /** Indexes to create after the table. Optional. */
  indexes?: SetupIndex[];
}

/** Single column in the SQLite schema. */
export interface SetupColumn {
  name: string;
  type: 'TEXT' | 'INTEGER' | 'REAL' | 'BLOB' | 'NUMERIC';
  notNull?: boolean;
  primaryKey?: boolean;
}

/** SQLite index definition. */
export interface SetupIndex {
  name: string;
  columns: string[];
  unique?: boolean;
}

/**
 * Env, optional driver override. Production leaves this undefined and the
 * destination loads better-sqlite3 or @libsql/client dynamically. Tests
 * provide a factory via `SqliteDriver` or a pre-built client via `client`.
 */
export interface Env extends DestinationServer.Env {
  SqliteDriver?: SqliteClientFactory;
  client?: SqliteClient;
}

export type Types = CoreDestination.Types<
  Settings,
  Mapping,
  Env,
  InitSettings,
  Setup
>;

export interface Destination extends DestinationServer.Destination<Types> {
  init: DestinationServer.InitFn<Types>;
}

export type Config = {
  settings: Settings;
} & DestinationServer.Config<Types>;

export type InitFn = DestinationServer.InitFn<Types>;
export type PushFn = DestinationServer.PushFn<Types>;
export type SetupFn = CoreSetupFn<Config, Env>;
export type PartialConfig = DestinationServer.PartialConfig<Types>;
export type PushEvents = DestinationServer.PushEvents<Mapping>;

export type Rule = WalkerOSMapping.Rule<Mapping>;
export type Rules = WalkerOSMapping.Rules<Rule>;
