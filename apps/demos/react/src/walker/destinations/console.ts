import type { Destination } from '@walkeros/core';

export const destinationConsole: Destination.InitDestination = {
  type: 'console',
  push: async (event) => {
    // eslint-disable-next-line no-console
    console.log('[Walker Event]:', event);
  },
};
