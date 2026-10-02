import type { Env, SqliteClient, SqliteClientFactory } from '../types';

// Narrow helper type aliases so mock functions are typed without `any`.
type ExecuteFn = (sql: string, args?: ReadonlyArray<unknown>) => Promise<void>;
type PrepareFn = (
  sql: string,
) => (args: ReadonlyArray<unknown>) => Promise<void>;
type QueryFn = (
  sql: string,
  args?: ReadonlyArray<unknown>,
) => Promise<ReadonlyArray<Record<string, unknown>>>;
type CloseFn = () => Promise<void>;

const asyncExecute: ExecuteFn = () => Promise.resolve();
const asyncClose: CloseFn = () => Promise.resolve();
const asyncPrepare: PrepareFn = () => () => Promise.resolve();
// The only query at init is the table probe (`name = ?`): answer that the
// asked-for table exists, so a simulated init reaches the prepared insert.
const asyncQuery: QueryFn = (_sql, args) =>
  Promise.resolve(typeof args?.[0] === 'string' ? [{ name: args[0] }] : []);

const mockClient: SqliteClient = {
  execute: asyncExecute,
  prepare: asyncPrepare,
  query: asyncQuery,
  close: asyncClose,
};

const mockFactory: SqliteClientFactory = () => Promise.resolve(mockClient);

export const push: Env = {
  SqliteDriver: mockFactory,
};

/**
 * Simulation tracking paths. Specifies which function calls to record when
 * running step examples through the collector. The client comes from the
 * async `SqliteDriver` factory, so the paths continue on its resolved value.
 * `prepare` records the INSERT statement; the row values go to the prepared
 * statement it returns, an anonymous function no path segment can name.
 */
export const simulation = [
  'call:SqliteDriver.prepare',
  'call:SqliteDriver.execute',
];
