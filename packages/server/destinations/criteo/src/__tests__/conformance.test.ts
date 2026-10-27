import path from 'path';
import { conformance } from '@walkeros/collector/dev';
import { destinationCriteo } from '..';
import { examples, schemas } from '../dev';

describe('criteo conformance', () => {
  beforeEach(() => {
    jest.useRealTimers();
  });

  it('conforms', async () => {
    await conformance('destination', destinationCriteo, {
      profile: 'http',
      examples: examples.step,
      schema: schemas.settings,
      settings: examples.minimal.settings,
      minimal: examples.minimal,
      root: path.join(__dirname, '..', '..'),
    });
  });
});
