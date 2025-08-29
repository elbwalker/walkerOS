import type { Destination } from '@walkeros/core';

export const destinationConsole: Destination.InitDestination = {
  type: 'console',
  push: async (event) => {
    // eslint-disable-next-line no-console
    console.log('[Event]:', event);
  },
};

export const destinationConsoleBatch: Destination.InitDestination = {
  type: 'console-batch',
  init: async () => {},
  push: async () => {},
  pushBatch: async (batch) => {
    // eslint-disable-next-line no-console
    console.log('[Batch]:', batch);
  },
};
