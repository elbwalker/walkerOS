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
      settings: { accessToken: 's3cr3t', tagId: 'UET-12345' },
      root: path.join(__dirname, '..', '..'),
    });
  });
});
