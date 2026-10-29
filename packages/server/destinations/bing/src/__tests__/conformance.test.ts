import path from 'path';
import { conformance } from '@walkeros/collector/dev';
import { destinationBing } from '..';
import { examples, schemas } from '../dev';

describe('bing conformance', () => {
  beforeEach(() => {
    jest.useRealTimers();
  });

  it('conforms', async () => {
    await conformance('destination', destinationBing, {
      profile: 'http',
      examples: examples.step,
      schema: schemas.settings,
      settings: examples.minimal.settings,
      minimal: examples.minimal,
      root: path.join(__dirname, '..', '..'),
    });
  });
});
