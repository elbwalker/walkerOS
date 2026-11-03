import type { Flow } from '@walkeros/core';

export const serveStaticFile: Flow.StepExample = {
  title: 'Serve static file',
  description:
    'Serve a static JavaScript file from store. ' +
    'Config: prefix: "/static", headers: { "Cache-Control": "public, max-age=3600" }',
  in: {
    name: 'page view',
    data: { path: '/static/walker.js' },
    id: 'ev-1700000600',
    trigger: 'load',
    entity: 'page',
    action: 'view',
    timestamp: 1700000600000,
    source: { type: 'express', platform: 'server' },
  },
  out: [
    [
      'respond',
      {
        status: 200,
        headers: {
          'Content-Type': 'application/javascript',
          'Cache-Control': 'public, max-age=3600',
        },
      },
    ],
  ],
};

export const missingFile: Flow.StepExample = {
  public: false,
  title: 'Missing file',
  description:
    'A path inside the prefix with no file in the store is answered 404 with Cache-Control no-store and never becomes an event.',
  in: {
    name: 'page view',
    data: { path: '/static/missing.js' },
    id: 'ev-1700000601',
    trigger: 'load',
    entity: 'page',
    action: 'view',
    timestamp: 1700000601000,
    source: { type: 'express', platform: 'server' },
  },
  out: [
    [
      'respond',
      {
        status: 404,
        body: { success: false, error: 'Not found' },
        headers: { 'Cache-Control': 'no-store' },
      },
    ],
  ],
};

export const storeUnavailable: Flow.StepExample = {
  public: false,
  title: 'Store unavailable',
  description:
    'The store read fails: the request is answered 503 with Cache-Control no-store and the push fails with the store error.',
  in: {
    name: 'page view',
    data: { path: '/static/walker.js' },
    id: 'ev-1700000602',
    trigger: 'load',
    entity: 'page',
    action: 'view',
    timestamp: 1700000602000,
    source: { type: 'express', platform: 'server' },
  },
  respond: { error: 'network' },
  out: [
    [
      'respond',
      {
        status: 503,
        body: { success: false, error: 'Service unavailable' },
        headers: { 'Cache-Control': 'no-store' },
      },
    ],
  ],
  outcome: { status: 'failed', code: 'transport' },
};
