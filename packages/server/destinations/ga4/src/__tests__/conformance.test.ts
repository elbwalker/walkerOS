import path from 'path';
import { conformance } from '@walkeros/collector/dev';
import { destinationGA4 } from '..';
import { examples, schemas } from '../dev';

describe('ga4 conformance', () => {
  beforeEach(() => {
    jest.useRealTimers();
  });

  it('conforms', async () => {
    await conformance('destination', destinationGA4, {
      profile: 'http',
      examples: examples.step,
      schema: schemas.settings,
      settings: examples.minimal.settings,
      minimal: examples.minimal,
      root: path.join(__dirname, '..', '..'),
    });
  });
});
