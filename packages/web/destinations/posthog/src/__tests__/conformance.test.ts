import path from 'path';
import { conformance } from '@walkeros/collector/dev';
import { destinationPostHog } from '..';
import { examples, schemas } from '../dev';

// posthog-js is ESM-first and Jest's CJS transformer can't parse it at import
// time. The conformance run wires examples.env, so the real module is never
// touched.
jest.mock('posthog-js', () => ({
  __esModule: true,
  default: {},
}));

// The posthog-js options are forwarded into posthog.init() as a whole.
const passThrough = [
  'api_host',
  'ui_host',
  'persistence',
  'person_profiles',
  'autocapture',
  'capture_pageview',
  'capture_pageleave',
  'capture_heatmaps',
  'capture_exceptions',
  'disable_surveys',
  'disable_session_recording',
  'advanced_disable_flags',
  'cookieless_mode',
  'debug',
  'session_recording',
  'bootstrap',
];

describe('posthog conformance', () => {
  beforeEach(() => {
    jest.useRealTimers();
  });

  it('conforms', async () => {
    await conformance('destination', destinationPostHog, {
      profile: 'web-sdk',
      examples: examples.step,
      schema: schemas.settings,
      settings: {
        apiKey: 'phc_a1b2c3d4e5f6789012345678abcdef12',
        api_host: 'https://eu.i.posthog.com',
        ui_host: 'https://eu.posthog.com',
        persistence: 'localStorage',
        person_profiles: 'identified_only',
        autocapture: false,
        capture_pageview: false,
        capture_pageleave: false,
        capture_heatmaps: false,
        capture_exceptions: false,
        disable_surveys: true,
        disable_session_recording: true,
        advanced_disable_flags: false,
        cookieless_mode: 'on_reject',
        debug: false,
        session_recording: { maskAllInputs: true },
        bootstrap: { distinctID: 'user-1' },
      },
      env: { push: examples.env.push, simulation: examples.env.simulation },
      root: path.join(__dirname, '..', '..'),
      passThrough,
    });
  });
});
