import path from 'path';
import { conformance } from '@walkeros/collector/dev';
import { destinationMParticle } from '..';
import { examples, schemas } from '../dev';

describe('mparticle conformance', () => {
  beforeEach(() => {
    jest.useRealTimers();
  });

  it('conforms', async () => {
    await conformance('destination', destinationMParticle, {
      profile: 'http',
      examples: examples.step,
      schema: schemas.settings,
      settings: { apiKey: 'key', apiSecret: 'secret' },
      root: path.join(__dirname, '..', '..'),
    });
  });
});
