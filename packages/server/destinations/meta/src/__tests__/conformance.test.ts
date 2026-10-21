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
      profile: 'http',
      examples: examples.step,
      schema: schemas.settings,
      settings: { accessToken: 's3cr3t', pixelId: '1234567890' },
      root: path.join(__dirname, '..', '..'),
    });
  });
});
