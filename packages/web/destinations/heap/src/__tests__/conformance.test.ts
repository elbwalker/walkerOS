import path from 'path';
import { conformance } from '@walkeros/collector/dev';
import { destinationHeap } from '..';
import { examples, schemas } from '../dev';

describe('heap conformance', () => {
  beforeEach(() => {
    jest.useRealTimers();
  });

  it('conforms', async () => {
    await conformance('destination', destinationHeap, {
      profile: 'vendor-global',
      examples: examples.step,
      schema: schemas.settings,
      settings: { appId: 'test-app-id' },
      env: { push: examples.env.push, simulation: examples.env.simulation },
      root: path.join(__dirname, '..', '..'),
    });
  });
});
