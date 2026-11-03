import path from 'path';
import { conformance } from '@walkeros/collector/dev';
import { transformerRedact } from '../transformer';
import { examples, schemas } from '../dev';

describe('redact conformance', () => {
  beforeEach(() => {
    jest.useRealTimers();
  });

  it('conforms', async () => {
    await conformance('transformer', transformerRedact, {
      profile: 'transformer',
      examples: examples.step,
      schema: schemas.settings,
      settings: { fieldsToRedact: ['email'] },
      root: path.join(__dirname, '..', '..'),
    });
  });
});
