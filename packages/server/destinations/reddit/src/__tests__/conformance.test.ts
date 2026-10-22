import path from 'path';
import { conformance } from '@walkeros/collector/dev';
import { destinationReddit } from '..';
import { examples, schemas } from '../dev';

describe('reddit conformance', () => {
  beforeEach(() => {
    jest.useRealTimers();
  });

  it('conforms', async () => {
    await conformance('destination', destinationReddit, {
      profile: 'http',
      examples: examples.step,
      schema: schemas.settings,
      settings: { accessToken: 's3cr3t', pixelId: 'a2_abcdef123456' },
      root: path.join(__dirname, '..', '..'),
    });
  });
});
