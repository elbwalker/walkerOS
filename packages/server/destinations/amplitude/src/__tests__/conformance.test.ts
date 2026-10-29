import path from 'path';
import { conformance } from '@walkeros/collector/dev';
import { destinationAmplitude } from '..';
import { examples, schemas } from '../dev';

// The runs without env use the SDK module: a stand-in that answers every
// call as sent.
jest.mock('@amplitude/analytics-node', () => {
  const sent = () => ({ promise: Promise.resolve({ code: 200 }) });
  class Chain {
    set() {
      return this;
    }
  }
  return {
    __esModule: true,
    init: () => ({ promise: Promise.resolve() }),
    track: sent,
    identify: sent,
    revenue: sent,
    setGroup: sent,
    groupIdentify: sent,
    setOptOut: () => undefined,
    flush: () => ({ promise: Promise.resolve() }),
    Identify: Chain,
    Revenue: Chain,
  };
});

describe('amplitude conformance', () => {
  beforeEach(() => {
    jest.useRealTimers();
  });

  it('conforms', async () => {
    await conformance('destination', destinationAmplitude, {
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
