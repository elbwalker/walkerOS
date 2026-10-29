import path from 'path';
import { conformance, runExamples } from '@walkeros/collector/dev';
import { destinationRudderStack } from '..';
import { examples, schemas } from '../dev';

// The runs without env load the SDK: a stand-in that sends every call.
jest.mock('@rudderstack/rudder-sdk-node', () => {
  const sent = (_params: unknown, callback?: () => void) => callback?.();
  return class {
    track = sent;
    identify = sent;
    group = sent;
    page = sent;
    screen = sent;
    alias = sent;
    flush = () => Promise.resolve();
  };
});

describe('rudderstack conformance', () => {
  beforeEach(() => {
    jest.useRealTimers();
  });

  it('conforms', async () => {
    await conformance('destination', destinationRudderStack, {
      profile: 'sdk-env',
      examples: examples.step,
      schema: schemas.settings,
      settings: examples.minimal.settings,
      env: { push: examples.env.push, simulation: examples.env.simulation },
      minimal: examples.minimal,
      root: path.join(__dirname, '..', '..'),
    });
  });

  it('sends nothing for a silent rule that finds nothing to send', async () => {
    const { companyGroupWithoutData } = examples.step;
    await runExamples(
      'destination',
      destinationRudderStack,
      { companyGroupWithoutData },
      {
        settings: {
          writeKey: 'test-write-key',
          dataPlaneUrl: 'https://hosted.rudderlabs.com',
        },
        env: { push: examples.env.push, simulation: examples.env.simulation },
      },
    );
  });
});
