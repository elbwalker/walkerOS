import path from 'path';
import { conformance, runExamples } from '@walkeros/collector/dev';
import { destinationHubspot } from '..';
import { examples, schemas } from '../dev';

// The runs without env load the SDK: keep it a local stand-in.
jest.mock('@hubspot/api-client', () => ({
  __esModule: true,
  Client: class {
    events = {
      send: {
        basicApi: { send: () => Promise.resolve() },
        batchApi: { send: () => Promise.resolve() },
      },
    };
    crm = { contacts: { basicApi: { update: () => Promise.resolve() } } };
  },
}));

describe('hubspot conformance', () => {
  beforeEach(() => {
    jest.useRealTimers();
  });

  it('conforms', async () => {
    await conformance('destination', destinationHubspot, {
      profile: 'sdk-env',
      examples: examples.step,
      schema: schemas.settings,
      settings: examples.minimal.settings,
      env: { push: examples.env.push, simulation: examples.env.simulation },
      minimal: examples.minimal,
      root: path.join(__dirname, '..', '..'),
    });
  });

  it('sends nothing for a silent identify rule that finds no email', async () => {
    const { userLoginWithoutEmail } = examples.step;
    await runExamples(
      'destination',
      destinationHubspot,
      { userLoginWithoutEmail },
      {
        settings: {
          accessToken: 'pat-test-xxx',
          eventNamePrefix: 'pe12345678_',
        },
        env: { push: examples.env.push, simulation: examples.env.simulation },
      },
    );
  });
});
