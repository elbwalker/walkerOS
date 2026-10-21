import path from 'path';
import { conformance } from '@walkeros/collector/dev';
import { destinationKlaviyo } from '..';
import { examples, schemas } from '../dev';

describe('klaviyo conformance', () => {
  beforeEach(() => {
    jest.useRealTimers();
  });

  it('conforms', async () => {
    await conformance('destination', destinationKlaviyo, {
      profile: 'sdk-env',
      examples: examples.step,
      schema: schemas.settings,
      settings: { apiKey: 'pk_test_key' },
      env: { push: examples.env.push, simulation: examples.env.simulation },
      root: path.join(__dirname, '..', '..'),
    });
  });
});
