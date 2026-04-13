import type { Flow } from '../types';
import { ConfigSchema } from '../schemas/flow';

describe('Flow.Config bundle section', () => {
  test('bundle.packages accepts Package records', () => {
    const config: Flow.Config = {
      version: 3,
      flows: {
        default: {
          web: {},
          bundle: {
            packages: {
              '@walkeros/collector': {},
              '@walkeros/web-source-browser': { version: '^3.2.0' },
            },
          },
        },
      },
    };
    expect(config.flows.default.bundle?.packages).toBeDefined();
    expect(
      config.flows.default.bundle?.packages?.['@walkeros/web-source-browser']
        .version,
    ).toBe('^3.2.0');
  });

  test('bundle.overrides accepts string records', () => {
    const config: Flow.Config = {
      version: 3,
      flows: {
        default: {
          web: {},
          bundle: {
            overrides: {
              '@amplitude/analytics-types': '2.11.1',
            },
          },
        },
      },
    };
    expect(config.flows.default.bundle?.overrides).toBeDefined();
    expect(
      config.flows.default.bundle?.overrides?.['@amplitude/analytics-types'],
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
    const result = ConfigSchema.safeParse({
      version: 3,
      flows: {
        default: {
          web: {},
          bundle: {
            packages: { '@walkeros/collector': {} },
          },
        },
      },
    });
    expect(result.success).toBe(true);
  });

  test('parses bundle.overrides as Record<string, string>', () => {
    const result = ConfigSchema.safeParse({
      version: 3,
      flows: {
        default: {
          web: {},
          bundle: {
            overrides: { '@amplitude/analytics-types': '2.11.1' },
          },
        },
      },
    });
    expect(result.success).toBe(true);
  });

  test('parses bundle.packages and bundle.overrides together', () => {
    const result = ConfigSchema.safeParse({
      version: 3,
      flows: {
        default: {
          web: {},
          bundle: {
            packages: { '@walkeros/collector': {} },
            overrides: { '@amplitude/analytics-types': '2.11.1' },
          },
        },
      },
    });
    expect(result.success).toBe(true);
  });

  test('rejects top-level packages with migration error', () => {
    const result = ConfigSchema.safeParse({
      version: 3,
      flows: {
        default: {
          web: {},
          packages: { '@walkeros/collector': {} },
        },
      },
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const msg = result.error.issues.map((e) => e.message).join(' ');
      expect(msg).toMatch(/bundle\.packages/);
      expect(msg).toMatch(/migration|moved/i);
    }
  });

  test('rejects unknown bundle field', () => {
    const raw: unknown = {
      version: 3,
      flows: {
        default: {
          web: {},
          bundle: {
            packages: { '@walkeros/collector': {} },
            unknown: 'field',
          },
        },
      },
    };
    const result = ConfigSchema.safeParse(raw);
    expect(result.success).toBe(false);
  });
});
