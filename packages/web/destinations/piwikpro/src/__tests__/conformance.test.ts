import path from 'path';
import { conformance } from '@walkeros/collector/dev';
import { destinationPiwikPro } from '..';
import { examples, schemas } from '../dev';

describe('piwikpro conformance', () => {
  beforeEach(() => {
    jest.useRealTimers();
  });

  it('conforms', async () => {
    await conformance('destination', destinationPiwikPro, {
      profile: 'vendor-global',
      examples: examples.step,
      schema: schemas.settings,
      settings: {
        appId: 'XXX-XXX-XXX-XXX-XXX',
        url: 'https://your_account_name.piwik.pro/',
      },
      env: { push: examples.env.push, simulation: examples.env.simulation },
      root: path.join(__dirname, '..', '..'),
    });
  });
});
