import path from 'path';
import { conformance } from '@walkeros/collector/dev';
import { destinationKafka } from '..';
import { examples, schemas } from '../dev';

describe('kafka conformance', () => {
  beforeEach(() => {
    jest.useRealTimers();
  });

  it('conforms', async () => {
    await conformance('destination', destinationKafka, {
      profile: 'socket',
      examples: examples.step,
      schema: schemas.settings,
      // No broker runs here: the runs without env fail their first connect
      // fast instead of retrying.
      settings: {
        kafka: {
          brokers: ['localhost:9092'],
          topic: 'walkeros-events',
          connectionTimeout: 100,
          retry: { retries: 0 },
        },
      },
      env: { push: examples.env.push, simulation: examples.env.simulation },
      minimal: examples.minimal,
      root: path.join(__dirname, '..', '..'),
    });
  });
});
