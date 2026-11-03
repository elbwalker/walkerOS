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
      // The step examples' fixture settings (see examples/step.ts).
      settings: { partnerId: 'PARTNER_ID', callerId: 'CALLER_ID' },
      minimal: examples.minimal,
      root: path.join(__dirname, '..', '..'),
    });
  });
});
