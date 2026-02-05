// walkerOS/packages/cli/src/commands/validate/validators/__tests__/flow.test.ts

import { describe, it, expect } from '@jest/globals';
import { validateFlow } from '../flow.js';

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
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        path: 'version',
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
