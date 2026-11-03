import path from 'path';
import { conformance } from '@walkeros/collector/dev';
import { destinationSnapchat } from '..';
import { examples, schemas } from '../dev';

describe('snapchat conformance', () => {
  beforeEach(() => {
    jest.useRealTimers();
  });

  it('conforms', async () => {
    await conformance('destination', destinationSnapchat, {
      profile: 'http',
      examples: examples.step,
      schema: schemas.settings,
      // The fixture the examples' endpoint pins, not the minimal placeholders.
      settings: { accessToken: 's3cr3t', pixelId: 'p1x3l1d' },
      minimal: examples.minimal,
      root: path.join(__dirname, '..', '..'),
    });
  });
});
