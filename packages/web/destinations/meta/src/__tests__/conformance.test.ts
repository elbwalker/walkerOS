import path from 'path';
import { conformance } from '@walkeros/collector/dev';
import { destinationMeta } from '..';
import { examples, schemas } from '../dev';

describe('meta conformance', () => {
  beforeEach(() => {
    jest.useRealTimers();
  });

  it('conforms', async () => {
    await conformance('destination', destinationMeta, {
      profile: 'vendor-global',
      examples: examples.step,
      schema: schemas.settings,
      settings: { pixelId: '1234567890' },
      env: { push: examples.env.push, simulation: examples.env.simulation },
      root: path.join(__dirname, '..', '..'),
    });
  });
});
