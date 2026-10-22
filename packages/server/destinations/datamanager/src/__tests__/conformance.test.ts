import path from 'path';
import { conformance } from '@walkeros/collector/dev';
import { destinationDataManager } from '..';
import { examples, schemas } from '../dev';

// The runs without an injected auth client build their own: a stand-in that
// answers with a token, so no Google OAuth is attempted.
jest.mock('google-auth-library', () => ({
  __esModule: true,
  GoogleAuth: class {
    getClient() {
      return Promise.resolve({
        getAccessToken: () => Promise.resolve({ token: 'ya29.c.test_token' }),
      });
    }
  },
}));

describe('datamanager conformance', () => {
  beforeEach(() => {
    jest.useRealTimers();
  });

  it('conforms', async () => {
    await conformance('destination', destinationDataManager, {
      profile: 'sdk-env',
      examples: examples.step,
      schema: schemas.settings,
      settings: {
        destinations: [
          {
            operatingAccount: {
              accountId: '123-456-7890',
              accountType: 'GOOGLE_ADS',
            },
            productDestinationId: 'AW-CONVERSION-123',
          },
        ],
      },
      env: { push: examples.env.push, simulation: examples.env.simulation },
      root: path.join(__dirname, '..', '..'),
    });
  });
});
