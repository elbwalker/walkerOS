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
      settings: { siteId: 'site', apiKey: 'key' },
      env: { push: examples.env.push, simulation: examples.env.simulation },
      root: path.join(__dirname, '..', '..'),
    });
  });
});
