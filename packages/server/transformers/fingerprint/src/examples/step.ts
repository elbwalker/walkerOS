import type { Flow } from '@walkeros/core';

export const serverFingerprint: Flow.StepExample = {
  title: 'Server fingerprint',
  description:
    'Standard server fingerprint using ingest.ip and ingest.userAgent. Requires source config.ingest.',
  in: {
    name: 'page view',
    data: {
      domain: 'www.example.com',
      title: 'Getting Started',
      id: '/docs/getting-started',
    },
    id: 'ev-1700000600',
    trigger: 'load',
    entity: 'page',
    action: 'view',
    timestamp: 1700000600,
    source: { type: 'express', platform: 'server' },
  },
  out: [
    [
      'return',
      {
        event: {
          name: 'page view',
          data: {
            domain: 'www.example.com',
            title: 'Getting Started',
            id: '/docs/getting-started',
          },
          user: { hash: '158f99cc06e33fd6' },
          id: 'ev-1700000600',
          trigger: 'load',
          entity: 'page',
          action: 'view',
          timestamp: 1700000600,
          source: { type: 'express', platform: 'server' },
        },
      },
    ],
  ],
};

export const missingFields: Flow.StepExample = {
  public: false,
  description:
    'Graceful handling when ingest is missing - fields resolve to empty strings, hash is still generated.',
  in: {
    name: 'session start',
    data: { id: 's3ss10n' },
    id: 'ev-1700000601',
    trigger: 'load',
    entity: 'session',
    action: 'start',
    timestamp: 1700000601,
    source: { type: 'express', platform: 'server' },
  },
  out: [
    [
      'return',
      {
        event: {
          name: 'session start',
          data: { id: 's3ss10n' },
          user: { hash: 'e183220b699c10a8' },
          id: 'ev-1700000601',
          trigger: 'load',
          entity: 'session',
          action: 'start',
          timestamp: 1700000601,
          source: { type: 'express', platform: 'server' },
        },
      },
    ],
  ],
};

export const ipAnonymization: Flow.StepExample = {
  title: 'IP anonymization',
  description:
    'Privacy-preserving fingerprint using key+fn pattern: ' +
    'fn truncates IP to /24 subnet before hashing, so 10.0.42.* users share a hash. ' +
    'Config: fields: [{ key: "ingest.ip", fn: ip => ip.replace(/\\.\\d+$/, ".0") }, "ingest.userAgent"]',
  in: {
    name: 'page view',
    data: {
      domain: 'www.example.com',
      title: 'Privacy Policy',
      id: '/privacy',
    },
    id: 'ev-1700000602',
    trigger: 'load',
    entity: 'page',
    action: 'view',
    timestamp: 1700000602,
    source: { type: 'express', platform: 'server' },
  },
  out: [
    [
      'return',
      {
        event: {
          name: 'page view',
          data: {
            domain: 'www.example.com',
            title: 'Privacy Policy',
            id: '/privacy',
          },
          user: { hash: '44d9154b9a9b3792' },
          id: 'ev-1700000602',
          trigger: 'load',
          entity: 'page',
          action: 'view',
          timestamp: 1700000602,
          source: { type: 'express', platform: 'server' },
        },
      },
    ],
  ],
};
