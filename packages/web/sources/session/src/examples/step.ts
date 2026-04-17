import type { Flow } from '@walkeros/core';

/**
 * Session source emits three elb calls on start:
 *   1. command('user', { session, device? })
 *   2. command('session', <full session data>)
 *   3. push({ name: 'session start', data: <full session data> })
 */

export const newMarketingSession: Flow.StepExample = {
  trigger: {
    type: 'load',
    options: {
      url: 'https://example.com/?utm_source=google&utm_medium=cpc&utm_campaign=winter-sale',
    },
  },
  in: { storage: true },
  out: [
    ['elb', 'user', { session: 's3ss10n-id', device: 'd3v1c3-id' }],
    [
      'elb',
      'session',
      {
        id: 's3ss10n-id',
        start: 1700000000000,
        isNew: true,
        count: 1,
        runs: 1,
        marketing: true,
        source: 'google',
        medium: 'cpc',
        campaign: 'winter-sale',
        referrer: '',
        device: 'd3v1c3-id',
        isStart: true,
        storage: true,
        updated: 1700000000000,
      },
    ],
    [
      'elb',
      {
        name: 'session start',
        data: {
          id: 's3ss10n-id',
          start: 1700000000000,
          isNew: true,
          count: 1,
          runs: 1,
          marketing: true,
          source: 'google',
          medium: 'cpc',
          campaign: 'winter-sale',
          referrer: '',
          device: 'd3v1c3-id',
          isStart: true,
          storage: true,
          updated: 1700000000000,
        },
      },
    ],
  ],
};

export const returningVisitor: Flow.StepExample = {
  trigger: {
    type: 'load',
    options: {
      referrer: 'https://google.com',
    },
  },
  in: { storage: true },
  out: [
    ['elb', 'user', { session: 'n3w-s3ss10n', device: 'd3v1c3-id' }],
    [
      'elb',
      'session',
      {
        id: 'n3w-s3ss10n',
        start: 1700001000000,
        isNew: false,
        count: 3,
        runs: 1,
        referrer: 'google.com',
        device: 'd3v1c3-id',
        isStart: true,
        storage: true,
        updated: 1700001000000,
      },
    ],
    [
      'elb',
      {
        name: 'session start',
        data: {
          id: 'n3w-s3ss10n',
          start: 1700001000000,
          isNew: false,
          count: 3,
          runs: 1,
          referrer: 'google.com',
          device: 'd3v1c3-id',
          isStart: true,
          storage: true,
          updated: 1700001000000,
        },
      },
    ],
  ],
};
