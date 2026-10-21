import path from 'path';
import { conformance } from '@walkeros/collector/dev';
import { page } from '@walkeros/web-core/dev';
import { destinationClarity } from '..';
import { examples, schemas } from '../dev';

describe('clarity conformance', () => {
  beforeEach(() => {
    jest.useRealTimers();
  });

  it('conforms', async () => {
    await conformance('destination', destinationClarity, {
      profile: 'vendor-global',
      page,
      examples: examples.step,
      schema: schemas.settings,
      // No settings.consent: the revocation reaches Clarity through the
      // destination's required consent alone.
      settings: { apiKey: 'test-project' },
      env: { push: examples.env.push, simulation: examples.env.simulation },
      root: path.join(__dirname, '..', '..'),
    });
  });
});
