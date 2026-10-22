import path from 'path';
import { conformance } from '@walkeros/collector/dev';
import { destinationPostHog } from '..';
import { examples, schemas } from '../dev';

// posthog-node is ESM-first and Jest cannot parse it: the runs without env
// get a stand-in client whose calls all land.
jest.mock('posthog-node', () => ({
  PostHog: class {
    capture = () => undefined;
    identify = () => undefined;
    groupIdentify = () => undefined;
    flush = () => Promise.resolve();
    shutdown = () => Promise.resolve();
    enable = () => undefined;
    disable = () => undefined;
  },
}));

describe('posthog conformance', () => {
  beforeEach(() => {
    jest.useRealTimers();
  });

  it('conforms', async () => {
    await conformance('destination', destinationPostHog, {
      profile: 'sdk-env',
      examples: examples.step,
      schema: schemas.settings,
      settings: { apiKey: 'phc_test' },
      env: { push: examples.env.push, simulation: examples.env.simulation },
      root: path.join(__dirname, '..', '..'),
    });
  });
});
