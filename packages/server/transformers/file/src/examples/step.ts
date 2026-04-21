import type { Flow } from '@walkeros/core';

export const serveStaticFile: Flow.StepExample = {
  title: 'Serve static file',
  description:
    'Serve a static JavaScript file from store. ' +
    'Config: prefix: "/static", headers: { "Cache-Control": "public, max-age=3600" }',
  in: {
    name: 'page view',
    data: { path: '/static/walker.js' },
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
