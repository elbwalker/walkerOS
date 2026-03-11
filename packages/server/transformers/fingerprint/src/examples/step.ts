import type { Flow } from '@walkeros/core';

export const serverFingerprint: Flow.StepExample = {
  in: {
    name: 'page view',
    data: {
      domain: 'www.example.com',
      title: 'Getting Started',
      id: '/docs/getting-started',
    },
    id: '1700000600-gr0up-1',
    trigger: 'load',
    entity: 'page',
    action: 'view',
    timestamp: 1700000600,
    group: 'gr0up',
    count: 1,
    version: { tagging: 1 },
    source: { type: 'server', id: '', previous_id: '' },
  },
  out: {
    event: {
      name: 'page view',
      data: {
        domain: 'www.example.com',
        title: 'Getting Started',
        id: '/docs/getting-started',
      },
      user: { hash: '158f99cc06e33fd6' },
      id: '1700000600-gr0up-1',
      trigger: 'load',
      entity: 'page',
      action: 'view',
      timestamp: 1700000600,
      group: 'gr0up',
      count: 1,
      version: { tagging: 1 },
      source: { type: 'server', id: '', previous_id: '' },
    },
  },
};

export const missingFields: Flow.StepExample = {
  in: {
    name: 'session start',
    data: { id: 's3ss10n' },
    id: '1700000601-gr0up-2',
    trigger: 'load',
    entity: 'session',
    action: 'start',
    timestamp: 1700000601,
    group: 'gr0up',
    count: 2,
    version: { tagging: 1 },
    source: { type: 'server', id: '', previous_id: '' },
  },
  out: {
    event: {
      name: 'session start',
      data: { id: 's3ss10n' },
      user: { hash: 'e183220b699c10a8' },
      id: '1700000601-gr0up-2',
      trigger: 'load',
      entity: 'session',
      action: 'start',
      timestamp: 1700000601,
      group: 'gr0up',
      count: 2,
      version: { tagging: 1 },
      source: { type: 'server', id: '', previous_id: '' },
    },
  },
};

export const ipAnonymization: Flow.StepExample = {
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
    id: '1700000602-gr0up-3',
    trigger: 'load',
    entity: 'page',
    action: 'view',
    timestamp: 1700000602,
    group: 'gr0up',
    count: 3,
    version: { tagging: 1 },
    source: { type: 'server', id: '', previous_id: '' },
  },
  out: {
    event: {
      name: 'page view',
      data: {
        domain: 'www.example.com',
        title: 'Privacy Policy',
        id: '/privacy',
      },
      user: { hash: '44d9154b9a9b3792' },
      id: '1700000602-gr0up-3',
      trigger: 'load',
      entity: 'page',
      action: 'view',
      timestamp: 1700000602,
      group: 'gr0up',
      count: 3,
      version: { tagging: 1 },
      source: { type: 'server', id: '', previous_id: '' },
    },
  },
};
