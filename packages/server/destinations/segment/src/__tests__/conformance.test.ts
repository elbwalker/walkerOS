import path from 'path';
import { conformance, runExamples } from '@walkeros/collector/dev';
import { destinationSegment } from '..';
import { examples, schemas } from '../dev';

// The runs without env load the SDK: a stand-in that delivers every call.
jest.mock('@segment/analytics-node', () => {
  const delivered = (_params: unknown, callback?: () => void) => callback?.();
  return {
    __esModule: true,
    Analytics: class {
      track = delivered;
      identify = delivered;
      group = delivered;
      page = delivered;
      screen = delivered;
      flush = () => Promise.resolve();
      closeAndFlush = () => Promise.resolve();
    },
  };
});

describe('segment conformance', () => {
  beforeEach(() => {
    jest.useRealTimers();
  });

  it('conforms', async () => {
    await conformance('destination', destinationSegment, {
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
      destinationSegment,
      { companyGroupWithoutData },
      {
        settings: { writeKey: 'test-write-key' },
        env: { push: examples.env.push, simulation: examples.env.simulation },
      },
    );
  });
});
