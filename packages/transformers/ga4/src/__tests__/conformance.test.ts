import path from 'path';
import { conformance, runExamples } from '@walkeros/collector/dev';
import { transformerGa4 } from '../transformer';
import { examples, schemas } from '../dev';

describe('transformer-ga4 conformance', () => {
  beforeEach(() => {
    jest.useRealTimers();
  });

  it('conforms', async () => {
    await conformance('transformer', transformerGa4, {
      profile: 'transformer',
      examples: examples.step,
      schema: schemas.settings,
      settings: {},
      root: path.join(__dirname, '..', '..'),
    });
  });

  it('fails an event without a GA4 request on a real collector', async () => {
    const { noRequest } = examples.step;
    await runExamples('transformer', transformerGa4, { noRequest });
  });
});
