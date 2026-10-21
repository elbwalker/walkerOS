import path from 'path';
import { conformance } from '@walkeros/collector/dev';
import { destinationMixpanel } from '..';
import { examples, schemas } from '../dev';

describe('mixpanel conformance', () => {
  beforeEach(() => {
    jest.useRealTimers();
  });

  it('conforms', async () => {
    await conformance('destination', destinationMixpanel, {
      profile: 'sdk-env',
      examples: examples.step,
      schema: schemas.settings,
      settings: { apiKey: 'token' },
      env: { push: examples.env.push, simulation: examples.env.simulation },
      root: path.join(__dirname, '..', '..'),
    });
  });
});
