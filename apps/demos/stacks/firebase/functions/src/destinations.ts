import { NodeDestination } from '@elbwalker/client-node';

export const logDestination: NodeDestination.Destination = {
  type: 'log',
  config: {},
  push: (events) => {
    console.dir({ date: Date.now(), events }, { depth: 4, color: true });
  },
};

export const failDestination: NodeDestination.Destination = {
  type: 'fail',
  config: {},
  push: () => {
    throw new Error('fail');
  },
};
