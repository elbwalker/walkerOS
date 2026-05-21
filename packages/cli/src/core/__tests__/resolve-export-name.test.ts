import type { Flow } from '@walkeros/core';
import { resolveExportName } from '../resolve-export-name.js';

describe('resolveExportName', () => {
  test('returns explicit import field on the step', () => {
    const flow: Flow = {
      config: { platform: 'server' },
      destinations: {
        pubsub: {
          package: '@walkeros/server-destination-gcp',
          import: 'destinationPubSub',
          config: {},
        },
      },
    };

    const result = resolveExportName(flow, 'destination', 'pubsub');
    expect(result).toEqual({
      exportName: 'destinationPubSub',
      source: 'import',
    });
  });

  test('falls back to bundle.packages.imports[0] when import is unset', () => {
    const flow: Flow = {
      config: {
        platform: 'server',
        bundle: {
          packages: {
            '@walkeros/server-destination-gcp': {
              imports: ['destinationBigQuery', 'destinationPubSub'],
            },
          },
        },
      },
      destinations: {
        bq: {
          package: '@walkeros/server-destination-gcp',
          config: {},
        },
      },
    };

    const result = resolveExportName(flow, 'destination', 'bq');
    expect(result).toEqual({
      exportName: 'destinationBigQuery',
      source: 'imports',
    });
  });

  test('explicit import takes precedence over imports[0]', () => {
    const flow: Flow = {
      config: {
        platform: 'server',
        bundle: {
          packages: {
            '@walkeros/server-destination-gcp': {
              imports: ['destinationBigQuery'],
            },
          },
        },
      },
      destinations: {
        pubsub: {
          package: '@walkeros/server-destination-gcp',
          import: 'destinationPubSub',
          config: {},
        },
      },
    };

    const result = resolveExportName(flow, 'destination', 'pubsub');
    expect(result).toEqual({
      exportName: 'destinationPubSub',
      source: 'import',
    });
  });

  test('returns default source when neither import nor imports set', () => {
    const flow: Flow = {
      config: { platform: 'server' },
      destinations: {
        api: {
          package: '@walkeros/server-destination-api',
          config: {},
        },
      },
    };

    const result = resolveExportName(flow, 'destination', 'api');
    expect(result).toEqual({ exportName: undefined, source: 'default' });
  });

  test('returns default source when imports is empty array', () => {
    const flow: Flow = {
      config: {
        platform: 'server',
        bundle: {
          packages: {
            '@walkeros/server-destination-gcp': { imports: [] },
          },
        },
      },
      destinations: {
        gcp: {
          package: '@walkeros/server-destination-gcp',
          config: {},
        },
      },
    };

    const result = resolveExportName(flow, 'destination', 'gcp');
    expect(result).toEqual({ exportName: undefined, source: 'default' });
  });

  test('handles inline code (object form) by treating it as no exportable name', () => {
    // Inline code objects describe push/init functions inline; setup has no
    // valid export name to resolve against. This case should return default
    // (caller will then fail with "no default export" if appropriate).
    const flow: Flow = {
      config: { platform: 'server' },
      destinations: {
        inline: {
          package: '@walkeros/server-destination-gcp',
          code: { push: '$code:async (e) => {}' },
          config: {},
        },
      },
    };

    const result = resolveExportName(flow, 'destination', 'inline');
    expect(result).toEqual({ exportName: undefined, source: 'default' });
  });

  test('resolves source kind', () => {
    const flow: Flow = {
      config: { platform: 'server' },
      sources: {
        http: {
          package: '@walkeros/server-source-express',
          import: 'sourceExpress',
          config: {},
        },
      },
    };

    const result = resolveExportName(flow, 'source', 'http');
    expect(result).toEqual({ exportName: 'sourceExpress', source: 'import' });
  });

  test('resolves store kind', () => {
    const flow: Flow = {
      config: { platform: 'server' },
      stores: {
        kv: {
          package: '@walkeros/server-store-fs',
          import: 'storeFs',
          config: {},
        },
      },
    };

    const result = resolveExportName(flow, 'store', 'kv');
    expect(result).toEqual({ exportName: 'storeFs', source: 'import' });
  });

  test('returns default source when component not in flow', () => {
    const flow: Flow = {
      config: { platform: 'server' },
      destinations: {},
    };

    const result = resolveExportName(flow, 'destination', 'missing');
    expect(result).toEqual({ exportName: undefined, source: 'default' });
  });
});
