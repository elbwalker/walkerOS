import path from 'path';
import { conformance } from '@walkeros/collector/dev';
import { destinationPlausible } from '..';
import { examples, schemas } from '../dev';

describe('plausible conformance', () => {
  beforeEach(() => {
    jest.useRealTimers();
  });

  it('conforms', async () => {
    await conformance('destination', destinationPlausible, {
      profile: 'vendor-global',
      examples: examples.step,
      schema: schemas.settings,
      settings: { domain: 'example.com' },
      env: { push: examples.env.push, simulation: examples.env.simulation },
      root: path.join(__dirname, '..', '..'),
    });
  });
});
