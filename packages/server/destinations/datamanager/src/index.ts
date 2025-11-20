import type { DestinationInterface } from './types';
import { getConfig } from './config';
import { push } from './push';

// Types
export * as DestinationDataManager from './types';

// Examples
export * as examples from './examples';

export const destinationDataManager: DestinationInterface = {
  type: 'datamanager',

  config: {},

  async init({ config: partialConfig }) {
    const config = getConfig(partialConfig);
    return config;
  },

  async push(event, { config, mapping, data, collector, env }) {
    return await push(event, { config, mapping, data, collector, env });
  },
};

export default destinationDataManager;
