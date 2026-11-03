import path from 'path';
import { conformance } from '@walkeros/collector/dev';
import { destinationCustomerIo } from '..';
import { examples, schemas } from '../dev';

describe('customerio conformance', () => {
  beforeEach(() => {
    jest.useRealTimers();
  });

  it('conforms', async () => {
    await conformance('destination', destinationCustomerIo, {
      profile: 'sdk-env',
      examples: examples.step,
      schema: schemas.settings,
      settings: examples.minimal.settings,
      env: { push: examples.env.push, simulation: examples.env.simulation },
      minimal: examples.minimal,
      root: path.join(__dirname, '..', '..'),
    });
  });
});
