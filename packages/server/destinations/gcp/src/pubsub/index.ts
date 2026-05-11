import type { Destination } from './types';
import { getConfig } from './config';
import { push } from './push';
import { setup } from './setup';

// Types re-export
export * as DestinationPubSub from './types';

export const destinationPubSub: Destination = {
  type: 'gcp-pubsub',

  config: {},

  setup,

  async init({ config: partialConfig, env, logger }) {
    return getConfig(partialConfig, env, logger);
  },

  async push(event, context) {
    return await push(event, context);
  },

  async destroy({ config }) {
    if (!config.settings) return;
    const { client } = config.settings;
    if (!client) return;
    try {
      await client.close();
    } catch {
      // Closing flushes outstanding publishes; swallow errors so a flush
      // failure does not leak the client. Detailed publish errors are
      // already surfaced by push().
    }
  },
};

export default destinationPubSub;
