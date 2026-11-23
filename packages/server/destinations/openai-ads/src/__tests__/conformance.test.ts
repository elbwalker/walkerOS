import path from 'path';
import { conformance } from '@walkeros/collector/dev';
import { destinationOpenAIAds } from '..';
import { examples, schemas } from '../dev';

describe('openai-ads conformance', () => {
  beforeEach(() => {
    jest.useRealTimers();
  });

  it('conforms', async () => {
    await conformance('destination', destinationOpenAIAds, {
      profile: 'http',
      examples: examples.step,
      schema: schemas.settings,
      settings: examples.minimal.settings,
      minimal: examples.minimal,
      root: path.join(__dirname, '..', '..'),
    });
  });
});
