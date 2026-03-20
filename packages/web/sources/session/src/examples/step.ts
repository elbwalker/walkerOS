import type { Flow } from '@walkeros/core';

export const newMarketingSession: Flow.StepExample = {
  trigger: {
    type: 'load',
    options: {
      url: 'https://example.com/?utm_source=google&utm_medium=cpc&utm_campaign=winter-sale',
    },
  },
  in: { storage: true },
  out: {
    name: 'session start',
    data: {
      isStart: true,
      isNew: true,
      count: 1,
      runs: 1,
      storage: true,
      id: 's3ss10n-id',
      device: 'd3v1c3-id',
      start: 1700000000000,
      marketing: true,
      source: 'google',
      medium: 'cpc',
      campaign: 'winter-sale',
    },
    entity: 'session',
    action: 'start',
  },
};

export const returningVisitor: Flow.StepExample = {
  trigger: {
    type: 'load',
    options: {
      referrer: 'https://google.com',
    },
  },
  in: { storage: true },
  out: {
    name: 'session start',
    data: {
      isStart: true,
      isNew: false,
      count: 3,
      runs: 1,
      storage: true,
      id: 'n3w-s3ss10n',
      device: 'd3v1c3-id',
      start: 1700001000000,
      referrer: 'google.com',
    },
    entity: 'session',
    action: 'start',
  },
};
