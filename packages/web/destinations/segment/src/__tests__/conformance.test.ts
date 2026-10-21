import path from 'path';
import { conformance } from '@walkeros/collector/dev';
import { page } from '@walkeros/web-core/dev';
import { destinationSegment } from '..';
import { examples, schemas } from '../dev';

// Analytics.js init options are forwarded into load() as a whole.
const passThrough = [
  'initialPageview',
  'disableClientPersistence',
  'disableAutoISOConversion',
  'retryQueue',
  'obfuscate',
  'integrations',
];

describe('segment conformance', () => {
  beforeEach(() => {
    jest.useRealTimers();
  });

  it('conforms', async () => {
    await conformance('destination', destinationSegment, {
      profile: 'web-sdk',
      page,
      examples: examples.step,
      schema: schemas.settings,
      settings: {
        apiKey: 'test-project',
        cdnURL: 'https://cdn.example.com',
        initialPageview: false,
        disableClientPersistence: true,
        disableAutoISOConversion: false,
        retryQueue: false,
        obfuscate: false,
        integrations: {},
      },
      env: { push: examples.env.push, simulation: examples.env.simulation },
      root: path.join(__dirname, '..', '..'),
      passThrough,
    });
  });
});
