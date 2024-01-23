import { NodeDestination } from '@elbwalker/client-node';

export const logDestination: NodeDestination.Function = {
  type: 'log',
  config: {},
  push: (events) => {
    console.dir({ date: Date.now(), events }, { depth: 4, color: true });
  },
};

export const failDestination: NodeDestination.Function = {
  type: 'fail',
  config: {},
  push: () => {
    throw new Error('fail');
  },
};
