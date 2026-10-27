import path from 'path';
import { conformance } from '@walkeros/collector/dev';
import { page } from '@walkeros/web-core/dev';
import { destinationSnowplow } from '..';
import { examples, schemas } from '../dev';

describe('snowplow conformance', () => {
  beforeEach(() => {
    jest.useRealTimers();
  });

  it('conforms', async () => {
    await conformance('destination', destinationSnowplow, {
      profile: 'vendor-global',
      page,
      examples: examples.step,
      schema: schemas.settings,
      settings: {
        collectorUrl: 'https://collector.example.com',
        pageViewEvent: 'page view',
        activityTracking: { minimumVisitLength: 30, heartbeatDelay: 10 },
      },
      minimal: examples.minimal,
      env: { push: examples.env.push, simulation: examples.env.simulation },
      root: path.join(__dirname, '..', '..'),
    });
  });
});
