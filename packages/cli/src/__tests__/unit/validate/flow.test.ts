// walkerOS/packages/cli/src/commands/validate/validators/__tests__/flow.test.ts

import { describe, it, expect } from '@jest/globals';
import { validateFlow } from '../../../commands/validate/validators/flow.js';

describe('validateFlow', () => {
  it('passes valid flow configuration', () => {
    const result = validateFlow({
      version: 1,
      flows: {
        default: {
          web: {},
          sources: {
            browser: {
              package: '@walkeros/web-source-browser',
            },
          },
          destinations: {
            gtag: {
              package: '@walkeros/web-destination-gtag',
            },
          },
        },
      },
    });

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('fails when version is missing', () => {
    const result = validateFlow({
      flows: {
        default: {
          web: {},
        },
      },
    });

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    // Core produces a schema validation error (path may be 'root' for union types)
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        code: 'SCHEMA_VALIDATION',
      }),
    );
  });

  it('fails when flows object is empty', () => {
    const result = validateFlow({
      version: 1,
      flows: {},
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        code: 'EMPTY_FLOWS',
      }),
    );
  });

  it('extracts flow names in details', () => {
    const result = validateFlow({
      version: 1,
      flows: {
        production: {
          web: {},
        },
        staging: {
          web: {},
        },
      },
    });

    expect(result.details.flowNames).toEqual(['production', 'staging']);
    expect(result.details.flowCount).toBe(2);
  });

  it('validates specific flow when flow option provided', () => {
    const result = validateFlow(
      {
        version: 1,
        flows: {
          production: {
            web: {},
            sources: { browser: { package: '@walkeros/web-source-browser' } },
          },
          staging: {
            web: {},
          },
        },
      },
      { flow: 'production' },
    );

    expect(result.valid).toBe(true);
    expect(result.details.validatedFlow).toBe('production');
  });

  it('fails when specified flow does not exist', () => {
    const result = validateFlow(
      {
        version: 1,
        flows: {
          production: {
            web: {},
          },
        },
      },
      { flow: 'staging' },
    );

    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        code: 'FLOW_NOT_FOUND',
        message: expect.stringContaining('staging'),
      }),
    );
  });

  it('maps core schema errors to CLI ValidationError shape', () => {
    // Missing version triggers core schema errors
    const result = validateFlow({
      flows: { default: { web: {} } },
    });

    expect(result.valid).toBe(false);
    expect(result.type).toBe('flow');
    for (const error of result.errors) {
      expect(error).toHaveProperty('path');
      expect(error).toHaveProperty('message');
      expect(typeof error.path).toBe('string');
      expect(typeof error.message).toBe('string');
    }
  });

  it('warns for dangling $var. references', () => {
    const result = validateFlow({
      version: 1,
      variables: { gaId: 'G-XXX' },
      flows: {
        default: {
          web: {},
          destinations: {
            ga4: {
              package: '@walkeros/web-destination-gtag',
              config: { settings: { id: '$var.nonExistent' } },
            },
          },
        },
      },
    });

    expect(result.valid).toBe(true);
    expect(
      result.warnings.some((w) => w.message.includes('$var.nonExistent')),
    ).toBe(true);
  });

  it('does not warn for valid $var. references', () => {
    const result = validateFlow({
      version: 1,
      variables: { gaId: 'G-XXX' },
      flows: {
        default: {
          web: {},
          destinations: {
            ga4: {
              config: { settings: { id: '$var.gaId' } },
            },
          },
        },
      },
    });

    expect(
      result.warnings.filter((w) => w.message.includes('$var.')),
    ).toHaveLength(0);
  });

  it('validates a realistic production config with context extraction', () => {
    const result = validateFlow({
      version: 1,
      variables: { gaId: 'G-12345', debug: false },
      definitions: { cleanUrl: { condition: true } },
      packages: {
        '@walkeros/web-source-browser': { version: '1.0.0' },
        '@walkeros/web-destination-gtag': {},
      },
      flows: {
        production: {
          web: {},
          sources: {
            browser: { package: '@walkeros/web-source-browser' },
          },
          destinations: {
            gtag: {
              package: '@walkeros/web-destination-gtag',
              config: { settings: { id: '$var.gaId' } },
            },
          },
        },
      },
    });

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.details.flowCount).toBe(1);
    expect(result.details.flowNames).toEqual(['production']);
    // Package without version gets a warning
    expect(
      result.warnings.some((w) =>
        w.path.includes('@walkeros/web-destination-gtag'),
      ),
    ).toBe(true);
    // Core context is exposed in details
    expect(result.details.context).toBeDefined();
    const ctx = result.details.context as Record<string, unknown>;
    expect((ctx.variables as Record<string, unknown>)?.gaId).toBe('G-12345');
    expect((ctx.stepNames as Record<string, string[]>)?.sources).toContain(
      'browser',
    );
    expect((ctx.stepNames as Record<string, string[]>)?.destinations).toContain(
      'gtag',
    );
    expect(ctx.platform).toBe('web');
  });

  it('warns about packages without version', () => {
    const result = validateFlow({
      version: 1,
      packages: {
        '@walkeros/collector': {},
      },
      flows: {
        default: {
          web: {},
        },
      },
    });

    expect(result.warnings).toContainEqual(
      expect.objectContaining({
        path: 'packages.@walkeros/collector',
        suggestion: expect.stringContaining('version'),
      }),
    );
  });
});
