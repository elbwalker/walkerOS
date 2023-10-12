import { destinationBigQuery } from '@elbwalker/destination-node-bigquery';
import { NodeDestination } from '@elbwalker/client-node';
import { firebaseStack } from '@elbwalker/stack-firebase';
import { Schema } from '@elbwalker/types';

const logDestination: NodeDestination.Function = {
  type: 'log',
  config: {},
  push: (events) => {
    console.dir({ date: Date.now(), events }, { depth: 4, color: true });
  },
};

const analystContract: Schema.Contract = {
  product: {
    '*': {
      data: {
        schema: {
          name: { required: true },
        },
      },
    },
  },
};

const scientistContract: Schema.Contract = {
  '*': {
    '*': {
      globals: {
        schema: {
          cart_value: { type: 'number' },
        },
      },
    },
  },
};

const { elb, push } = firebaseStack({
  client: {
    destinations: { log: logDestination },
    contracts: [analystContract, scientistContract],
  },
});

elb('walker destination', {
  config: {},
  push: () => {
    throw new Error('fail');
  },
});

elb('walker destination', destinationBigQuery, {
  custom: { projectId: 'eventpipe-f9979' },
});

export const ingest = push({ cors: true, region: 'europe-west1' });
