import type { Destination } from './types';
import { getConfig } from './config';
import { push } from './push';

// Types
export * as DestinationOpenAIAds from './types';

export const destinationOpenAIAds: Destination = {
  type: 'openai-ads',

  config: {},

  async init({ config: partialConfig }) {
    return getConfig(partialConfig);
  },

  async push(event, context) {
    return await push(event, context);
  },
};

export default destinationOpenAIAds;
