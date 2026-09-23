import type { Flow } from '@walkeros/core';

export const serverFingerprint: Flow.StepExample = {
  title: 'Server fingerprint',
  description:
    'Default server fingerprint: the anonymized ingest.ip, the reduced ingest.userAgent and the site, keyed with settings.salt and rotated daily. ' +
    'Config: { salt: "$env.FINGERPRINT_SALT", length: 16 }. Requires source config.ingest. The hash depends on the salt and the day.',
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
    'Graceful handling when ingest is missing: each empty input logs one warning, and the hash is still generated.',
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
    'The ip input anonymizes the IP before hashing (IPv4 /24, IPv6 /48), so visitors from the same 10.0.42.* subnet ' +
    'with the same browser, major version and OS share a hash within a day. No custom fn needed. Config: { salt: "$env.FINGERPRINT_SALT", length: 16 }',
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
