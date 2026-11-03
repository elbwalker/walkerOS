import path from 'path';
import { conformance } from '@walkeros/collector/dev';
import { page } from '@walkeros/web-core/dev';
import { destinationOptimizely } from '..';
import { examples, schemas } from '../dev';

describe('optimizely conformance', () => {
  beforeEach(() => {
    jest.useRealTimers();
  });

  it('conforms', async () => {
    await conformance('destination', destinationOptimizely, {
      profile: 'web-sdk',
      page,
      examples: examples.step,
      schema: schemas.settings,
      settings: {
        sdkKey: 'abc123SdkKey',
        userId: 'user.id',
        attributes: { map: { plan: 'user.plan' } },
        updateInterval: 60000,
        autoUpdate: true,
        batchSize: 10,
        flushInterval: 1000,
      },
      minimal: examples.minimal,
      env: { push: examples.env.push, simulation: examples.env.simulation },
      root: path.join(__dirname, '..', '..'),
    });
  });
});
