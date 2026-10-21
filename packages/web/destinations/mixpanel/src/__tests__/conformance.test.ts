import path from 'path';
import { conformance } from '@walkeros/collector/dev';
import { destinationMixpanel } from '..';
import { examples, schemas } from '../dev';

// mixpanel-browser is ESM-style and Jest's CJS transformer can't parse it at
// import time. The conformance run wires examples.env, so the real module is
// never touched.
jest.mock('mixpanel-browser', () => ({
  __esModule: true,
  default: {},
}));

// The mixpanel-browser config keys are forwarded into mp.init() as a whole.
const passThrough = [
  'api_host',
  'persistence',
  'cross_subdomain_cookie',
  'cookie_expiration',
  'secure_cookie',
  'ip',
  'batch_requests',
  'batch_size',
  'batch_flush_interval_ms',
  'debug',
  'opt_out_tracking_by_default',
  'track_pageview',
  'autocapture',
  'record_sessions_percent',
  'record_mask_all_inputs',
];

describe('mixpanel conformance', () => {
  beforeEach(() => {
    jest.useRealTimers();
  });

  it('conforms', async () => {
    await conformance('destination', destinationMixpanel, {
      profile: 'web-sdk',
      examples: examples.step,
      schema: schemas.settings,
      settings: {
        apiKey: 'a1b2c3d4e5f6789012345678abcdef12',
        api_host: 'https://api-eu.mixpanel.com',
        persistence: 'localStorage',
        cross_subdomain_cookie: false,
        cookie_expiration: 30,
        secure_cookie: true,
        ip: false,
        batch_requests: true,
        batch_size: 25,
        batch_flush_interval_ms: 2000,
        debug: false,
        opt_out_tracking_by_default: false,
        track_pageview: false,
        autocapture: false,
        record_sessions_percent: 0,
        record_mask_all_inputs: true,
      },
      env: { push: examples.env.push, simulation: examples.env.simulation },
      root: path.join(__dirname, '..', '..'),
      passThrough,
    });
  });
});
