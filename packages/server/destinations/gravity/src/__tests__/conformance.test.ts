import path from 'path';
import { conformance } from '@walkeros/collector/dev';
import { destinationGravity } from '..';
import { examples, schemas } from '../dev';

describe('gravity conformance', () => {
  beforeEach(() => {
    jest.useRealTimers();
  });

  it('conforms', async () => {
    await conformance('destination', destinationGravity, {
      profile: 'http',
      examples: examples.step,
      schema: schemas.settings,
      settings: examples.minimal.settings,
      minimal: examples.minimal,
      root: path.join(__dirname, '..', '..'),
    });
  });
});
