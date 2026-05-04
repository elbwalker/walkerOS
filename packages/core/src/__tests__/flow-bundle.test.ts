import type { Flow } from '../types';
import { JsonSchema } from '../schemas/flow';

describe('Flow.Json bundle section', () => {
  test('bundle.packages accepts Package records', () => {
    const config: Flow.Json = {
      version: 4,
      flows: {
        default: {
          config: {
            platform: 'web',
            bundle: {
              packages: {
                '@walkeros/collector': {},
                '@walkeros/web-source-browser': { version: '^3.2.0' },
              },
            },
          },
        },
      },
    };
    expect(config.flows.default.config?.bundle?.packages).toBeDefined();
    expect(
      config.flows.default.config?.bundle?.packages?.[
        '@walkeros/web-source-browser'
      ].version,
    ).toBe('^3.2.0');
  });

  test('bundle.overrides accepts string records', () => {
    const config: Flow.Json = {
      version: 4,
      flows: {
        default: {
          config: {
            platform: 'web',
            bundle: {
              overrides: {
                '@amplitude/analytics-types': '2.11.1',
              },
            },
          },
        },
      },
    };
    expect(config.flows.default.config?.bundle?.overrides).toBeDefined();
    expect(
      config.flows.default.config?.bundle?.overrides?.[
        '@amplitude/analytics-types'
      ],
    ).toBe('2.11.1');
  });

  test('bundle.packages and bundle.overrides coexist', () => {
    const bundle: Flow.Bundle = {
      packages: {
        '@walkeros/collector': { version: 'latest' },
      },
      overrides: {
        '@amplitude/analytics-types': '2.11.1',
      },
    };
    expect(bundle.packages).toBeDefined();
    expect(bundle.overrides).toBeDefined();
  });
});

describe('Flow Zod schema — bundle section', () => {
  test('parses bundle.packages', () => {
    const result = JsonSchema.safeParse({
      version: 4,
      flows: {
        default: {
          config: {
            platform: 'web',
            bundle: {
              packages: { '@walkeros/collector': {} },
            },
          },
        },
      },
    });
    expect(result.success).toBe(true);
  });

  test('parses bundle.overrides as Record<string, string>', () => {
    const result = JsonSchema.safeParse({
      version: 4,
      flows: {
        default: {
          config: {
            platform: 'web',
            bundle: {
              overrides: { '@amplitude/analytics-types': '2.11.1' },
            },
          },
        },
      },
    });
    expect(result.success).toBe(true);
  });

  test('parses bundle.packages and bundle.overrides together', () => {
    const result = JsonSchema.safeParse({
      version: 4,
      flows: {
        default: {
          config: {
            platform: 'web',
            bundle: {
              packages: { '@walkeros/collector': {} },
              overrides: { '@amplitude/analytics-types': '2.11.1' },
            },
          },
        },
      },
    });
    expect(result.success).toBe(true);
  });

  test('rejects unknown bundle field', () => {
    const raw: unknown = {
      version: 4,
      flows: {
        default: {
          config: {
            platform: 'web',
            bundle: {
              packages: { '@walkeros/collector': {} },
              unknown: 'field',
            },
          },
        },
      },
    };
    const result = JsonSchema.safeParse(raw);
    expect(result.success).toBe(false);
  });
});
