import type { Destination, WalkerOS } from '@walkeros/core';

export const destinationConsole: Destination.Instance = {
  config: {},
  type: 'console',
  push: async (event: WalkerOS.Event) => {
    // eslint-disable-next-line no-console
    console.log('[Event]:', event);
  },
};

export const destinationConsoleBatch: Destination.Instance = {
  config: {},
  type: 'console-batch',
  init: async () => {},
  push: async (_event: WalkerOS.Event) => {},
  pushBatch: async (batch: { events: WalkerOS.Events }) => {
    // eslint-disable-next-line no-console
    console.log('[Batch]:', batch);
  },
};
