// Shared bootstrap and capture readers for the destination's test files.
//
// Not a suite: jest's `testMatch` only picks up `*.test.ts`, so this module is
// imported rather than run. It exists so the push, batch and step-example
// suites agree on what "initialized" means and on how a captured insert is
// read back, instead of each keeping its own copy.

import type { MockLogger } from '@walkeros/core';
import { createMockContext } from '@walkeros/core';
import {
  __getCalls,
  __reset,
  createClient,
} from '../__mocks__/@clickhouse/client';
import destination from '../';
import type { Env, PartialConfig } from '../types';

/** The endpoint every test bootstraps against. Nothing ever connects to it. */
export const url = 'https://clickhouse.example.com:8443';

/** The destination id the collector would assign. */
export const id = 'clickhouse';

/** The recording factory, so an insert is observable without a socket. */
export const env: Env = { ClickHouseClient: createClient };

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/**
 * A destination bootstrapped through the real init, with the captured calls
 * cleared afterwards, so everything a test reads back was sent by the push
 * under test rather than by the bootstrap.
 */
export async function initialized(
  logger: MockLogger,
  config: PartialConfig = { settings: { url } },
): Promise<PartialConfig> {
  const resolved = await destination.init(
    createMockContext({ config, env, id, logger }),
  );

  if (!resolved) throw new Error('init must return the resolved config');

  __reset();

  return resolved;
}

/** The parameters of every captured insert, in the order the inserts ran. */
export function insertCalls(): Record<string, unknown>[] {
  return __getCalls()
    .filter(([name]) => name === 'insert')
    .map(([, params]) => {
      if (!isRecord(params))
        throw new Error('an insert carries its parameters');

      return params;
    });
}

/** The rows of every captured insert, flattened in insert order. */
export function insertedRows(): unknown[] {
  return insertCalls().flatMap((params) => {
    const { values } = params;

    if (!Array.isArray(values)) throw new Error('an insert carries its rows');

    return values;
  });
}

/** The deduplication token of every captured insert, in insert order. */
export function insertTokens(): unknown[] {
  return insertCalls().map((params) => {
    const settings = params.clickhouse_settings;

    if (!isRecord(settings))
      throw new Error('an insert carries its clickhouse settings');

    return settings.insert_deduplication_token;
  });
}
