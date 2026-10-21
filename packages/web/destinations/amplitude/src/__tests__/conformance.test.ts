import path from 'path';
import { conformance } from '@walkeros/collector/dev';
import { destinationAmplitude } from '..';
import { examples, schemas } from '../dev';

// Amplitude BrowserOptions are forwarded into the SDK as a whole.
const passThrough = [
  'serverZone',
  'flushIntervalMillis',
  'flushQueueSize',
  'flushMaxRetries',
  'transport',
  'useBatch',
  'appVersion',
];

describe('amplitude conformance', () => {
  beforeEach(() => {
    jest.useRealTimers();
  });

  it('conforms', async () => {
    await conformance('destination', destinationAmplitude, {
      profile: 'web-sdk',
      examples: examples.step,
      schema: schemas.settings,
      settings: {
        apiKey: 'a1b2c3d4e5f6789012345678abcdef12',
        serverZone: 'EU',
        flushIntervalMillis: 1000,
        flushQueueSize: 30,
        flushMaxRetries: 5,
        transport: 'fetch',
        useBatch: false,
        appVersion: '1.0.0',
      },
      env: { push: examples.env.push, simulation: examples.env.simulation },
      root: path.join(__dirname, '..', '..'),
      passThrough,
    });
  });
});
