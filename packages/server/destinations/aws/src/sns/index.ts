import type { Destination } from './types';
import { getConfig } from './config';
import { push } from './push';
import { setup } from './setup';

// Types
export * as DestinationSNS from './types';

export const destinationSNS: Destination = {
  type: 'aws-sns',

  config: {},

  setup,

  async init({ config, env, logger, id }) {
    return getConfig(config, env, logger, id);
  },

  push,

  async destroy({ config, logger }) {
    const runtime = config.settings?.runtime;
    if (!runtime) return;

    // Let publishes on the wire land before closing the client under them.
    await runtime.inflight.settle();

    if (!runtime.ownsClient) return;
    runtime.ownsClient = false;
    config.settings?.client?.destroy?.();
    logger.debug('SNS client closed');
  },
};

export default destinationSNS;
