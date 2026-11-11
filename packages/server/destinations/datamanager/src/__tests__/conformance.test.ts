import path from 'path';
import { conformance, runExamples } from '@walkeros/collector/dev';
import { destinationDataManager } from '..';
import { examples, schemas } from '../dev';

// The runs without an injected auth client build their own: a stand-in that
// answers with request headers, so no Google OAuth is attempted.
jest.mock('google-auth-library', () => ({
  __esModule: true,
  GoogleAuth: class {
    getClient() {
      return Promise.resolve({
        getRequestHeaders: () =>
          Promise.resolve(
            new Headers({ authorization: 'Bearer ya29.c.test_token' }),
          ),
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
      settings: examples.minimal.settings,
      env: { push: examples.env.push, simulation: examples.env.simulation },
      minimal: examples.minimal,
      root: path.join(__dirname, '..', '..'),
    });
  });

  it('runs every example to its declared out and outcome', () =>
    runExamples('destination', destinationDataManager, examples.step, {
      settings: examples.minimal.settings,
      env: { push: examples.env.push, simulation: examples.env.simulation },
    }));
});
