import type { Env } from '../types';
import { createClient } from '../__mocks__/@clickhouse/client';

/**
 * Example environment for the ClickHouse destination.
 *
 * The client factory is the recording stand-in from the package-local
 * __mocks__ folder, so examples, tests and simulations share one source of
 * truth and never reach a ClickHouse server.
 */
export const push: Env = {
  ClickHouseClient: createClient,
};

export const simulation = ['call:ClickHouseClient.insert'];
