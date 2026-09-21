import type { Destination } from './types';
import { getConfig } from './config';
import { push } from './push';
import { pushBatch } from './pushBatch';

// Types
export * as DestinationClickHouse from './types';

/**
 * The ClickHouse destination.
 *
 * `pushBatch` is exported beside `push` because the collector engages batching
 * only for a destination that carries it, and bulk inserts are the whole point
 * of this package.
 */
export const destinationClickHouse: Destination = {
  type: 'clickhouse',

  config: {},

  async init({ config, env, logger }) {
    return getConfig(config, env, logger);
  },

  push,

  pushBatch,

  async destroy({ config, logger }) {
    const settings = config.settings;
    const client = settings?.client;

    if (!settings || !client) return;

    // Release the handle before closing. The SDK documents close as a call to
    // make once per lifecycle and promises nothing about a second one, so a
    // repeated destroy has to end here rather than in the connection pool.
    settings.client = undefined;

    // The collector flushes every batch before it calls destroy, so normally
    // there is nothing left to send and closing the connection pool is the
    // whole job. A flush that outran the collector's shutdown race is the
    // exception: its insert is still in flight, and closing destroys the
    // sockets under it.
    await client.close();

    logger.debug('ClickHouse client closed');
  },
};

export default destinationClickHouse;
