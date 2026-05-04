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
    timestamp: 1700000600,
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
