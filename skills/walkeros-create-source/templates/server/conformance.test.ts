import path from 'path';
import { conformance } from '@walkeros/collector/dev';
import { sourceMySource } from '..';
import { examples, schemas } from '../dev';

describe('my-source conformance', () => {
  beforeEach(() => {
    jest.useRealTimers();
  });

  it('conforms', async () => {
    await conformance('source', sourceMySource, {
      profile: 'source',
      examples: examples.step,
      schema: schemas.settings,
      settings: {},
      root: path.join(__dirname, '..', '..'),
      createTrigger: examples.createTrigger,
    });
  });
});
