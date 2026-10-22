import path from 'path';
import { conformance } from '@walkeros/collector/dev';
import { destinationAPI } from '..';
import { examples, schemas } from '../dev';

describe('api conformance', () => {
  beforeEach(() => {
    jest.useRealTimers();
  });

  it('conforms', async () => {
    await conformance('destination', destinationAPI, {
      profile: 'http',
      examples: examples.step,
      schema: schemas.settings,
      settings: { url: 'https://api.example.com/events' },
      root: path.join(__dirname, '..', '..'),
    });
  });
});
