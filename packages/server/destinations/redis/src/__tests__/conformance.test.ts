import path from 'path';
import { conformance } from '@walkeros/collector/dev';
import { destinationRedis } from '..';
import { examples, schemas } from '../dev';

describe('redis conformance', () => {
  beforeEach(() => {
    jest.useRealTimers();
  });

  it('conforms', async () => {
    await conformance('destination', destinationRedis, {
      profile: 'socket',
      examples: examples.step,
      schema: schemas.settings,
      settings: { redis: { streamKey: 'walkeros:events' } },
      env: { push: examples.env.push, simulation: examples.env.simulation },
      root: path.join(__dirname, '..', '..'),
    });
  });
});
