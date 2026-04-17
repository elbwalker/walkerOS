import type { Env, SqliteClient, SqliteClientFactory } from '../types';

// Narrow helper type aliases so mock functions are typed without `any`.
type ExecuteFn = (sql: string, args?: ReadonlyArray<unknown>) => Promise<void>;
type PrepareFn = (
  sql: string,
) => (args: ReadonlyArray<unknown>) => Promise<void>;
type CloseFn = () => Promise<void>;

const asyncExecute: ExecuteFn = () => Promise.resolve();
const asyncClose: CloseFn = () => Promise.resolve();
const asyncPrepare: PrepareFn = () => () => Promise.resolve();

const mockClient: SqliteClient = {
  execute: asyncExecute,
  prepare: asyncPrepare,
  close: asyncClose,
};

const mockFactory: SqliteClientFactory = () => Promise.resolve(mockClient);

export const push: Env = {
  SqliteDriver: mockFactory,
};

/**
 * Simulation tracking paths. Specifies which function calls to record when
 * running step examples through the collector.
 */
export const simulation = ['call:client.prepare', 'call:client.execute'];
