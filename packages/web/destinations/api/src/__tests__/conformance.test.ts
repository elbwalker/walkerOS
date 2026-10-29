import path from 'path';
import { conformance } from '@walkeros/collector/dev';
import { page } from '@walkeros/web-core/dev';
import { destinationAPI } from '..';
import { examples, schemas } from '../dev';

describe('api conformance', () => {
  beforeEach(() => {
    jest.useRealTimers();
  });

  it('conforms', async () => {
    await conformance('destination', destinationAPI, {
      profile: 'http',
      page,
      examples: examples.step,
      schema: schemas.settings,
      settings: examples.minimal.settings,
      minimal: examples.minimal,
      root: path.join(__dirname, '..', '..'),
    });
  });
});
