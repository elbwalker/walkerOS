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
      profile: 'http',
      examples: examples.step,
      schema: schemas.settings,
      settings: {
        url: 'https://your_account_name.piwik.pro/',
        appId: 'e8f3a1c2-0b4d-4e5f-9a6b-7c8d9e0f1a2b',
      },
      root: path.join(__dirname, '..', '..'),
    });
  });
});
