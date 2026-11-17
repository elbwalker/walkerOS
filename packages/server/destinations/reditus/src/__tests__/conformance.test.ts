import path from 'path';
import { conformance } from '@walkeros/collector/dev';
import { destinationReditus } from '..';
import { examples, schemas } from '../dev';

describe('reditus conformance', () => {
  beforeEach(() => {
    jest.useRealTimers();
  });

  it('conforms', async () => {
    await conformance('destination', destinationReditus, {
      profile: 'http',
      examples: examples.step,
      schema: schemas.settings,
      settings: examples.minimal.settings,
      minimal: examples.minimal,
      root: path.join(__dirname, '..', '..'),
    });
  });
});
