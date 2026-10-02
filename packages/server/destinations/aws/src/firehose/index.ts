import type { Destination } from './types';
import { getConfig } from './config';
import { push } from './push';
import { pushBatch } from './pushBatch';

// Types
export * as DestinationFirehose from './types';

/**
 * The Firehose destination. Batching is on by default: a flushed batch goes
 * out as `PutRecordBatch` calls of at most 500 records.
 */
export const destinationFirehose: Destination = {
  type: 'aws-firehose',

  config: { batch: { size: 500, age: 1000 } },

  async init({ config, env, logger }) {
    return getConfig(config, env, logger);
  },

  push,

  pushBatch,

  async destroy({ config, logger }) {
    const runtime = config.settings?.runtime;
    if (!runtime) return;

    // The collector awaits only the last flush per buffer, so earlier sends
    // can still be on the wire. Closing the client would cut them off.
    await runtime.inflight.settle();

    if (!runtime.ownsClient) return;
    runtime.ownsClient = false;
    config.settings?.client?.destroy?.();
    logger.debug('Firehose client closed');
  },
};

export default destinationFirehose;
