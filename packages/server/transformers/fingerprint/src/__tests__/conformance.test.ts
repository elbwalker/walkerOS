import path from 'path';
import { conformance, runExamples } from '@walkeros/collector/dev';
import { transformerFingerprint } from '../transformer';
import { examples, schemas } from '../dev';

const settings = { salt: 'test-salt', length: 16 };

describe('fingerprint conformance', () => {
  beforeEach(() => {
    jest.useRealTimers();
  });

  it('conforms', async () => {
    await conformance('transformer', transformerFingerprint, {
      profile: 'transformer',
      examples: examples.step,
      schema: schemas.settings,
      settings,
      root: path.join(__dirname, '..', '..'),
    });
  });

  it('fails an event without visitor inputs on a real collector', async () => {
    const { missingIngest } = examples.step;
    await runExamples(
      'transformer',
      transformerFingerprint,
      { missingIngest },
      { settings },
    );
  });
});
