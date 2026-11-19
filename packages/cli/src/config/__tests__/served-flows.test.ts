import type { Flow } from '@walkeros/core';
import { servedFlowErrors } from '../served-flows';

function file(listing: Record<string, string>): Flow.Json {
  return {
    version: 4,
    flows: {
      server: { config: { platform: 'server', bundle: { flows: listing } } },
      casamoda: { config: { platform: 'web' } },
    },
  };
}

describe('servedFlowErrors', () => {
  it.each([
    ['flow.mjs', 'flow.mjs'],
    ['flow.mjs/x.js', 'flow.mjs'],
    ['package.json', 'package.json'],
    ['node_modules/x/walker.js', 'node_modules'],
  ])('refuses %s, inside %s of the server build', (value, entry) => {
    expect(
      servedFlowErrors(file({ casamoda: value }), 'server').errors,
    ).toEqual([
      {
        path: 'flows.server.config.bundle.flows.casamoda',
        code: 'SERVED_PATH_CONFLICT',
        message: `"${value}" collides with "${entry}", which the server build writes`,
        value,
      },
    ]);
  });

  it.each([
    ['Flow.mjs', 'flow.mjs'],
    ['PACKAGE.JSON', 'package.json'],
    ['Node_modules/x/walker.js', 'node_modules'],
  ])(
    'refuses %s, %s in another case on a case-insensitive file system',
    (value, entry) => {
      expect(
        servedFlowErrors(file({ casamoda: value }), 'server').errors,
      ).toEqual([
        {
          path: 'flows.server.config.bundle.flows.casamoda',
          code: 'SERVED_PATH_CONFLICT',
          message: `"${value}" collides with "${entry}", which the server build writes`,
          value,
        },
      ]);
    },
  );

  it.each(['flow.mjs.d/walker.js', 'packages/walker.js'])(
    'passes %s',
    (value) => {
      expect(servedFlowErrors(file({ casamoda: value }), 'server')).toEqual({
        served: [{ flow: 'casamoda', path: value }],
        errors: [],
      });
    },
  );

  it("passes core's issues through with their code and message", () => {
    expect(
      servedFlowErrors(file({ ghost: 'ghost/walker.js' }), 'server').errors,
    ).toEqual([
      {
        path: 'flows.server.config.bundle.flows.ghost',
        code: 'SERVED_FLOW_NOT_WEB',
        message: '"ghost" is no flow of this file',
      },
    ]);
  });
});
