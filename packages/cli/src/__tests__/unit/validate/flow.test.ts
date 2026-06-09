// walkerOS/packages/cli/src/commands/validate/validators/__tests__/flow.test.ts

import { describe, it, expect } from '@jest/globals';
import { validateFlow } from '../../../commands/validate/validators/flow.js';

describe('validateFlow', () => {
  it('passes valid flow configuration', () => {
    const result = validateFlow({
      version: 4,
      flows: {
        default: {
          config: { platform: 'web' },
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
          config: { platform: 'web' },
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
      version: 4,
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
      version: 4,
      flows: {
        production: {
          config: { platform: 'web' },
        },
        staging: {
          config: { platform: 'web' },
        },
      },
    });

    expect(result.details.flowNames).toEqual(['production', 'staging']);
    expect(result.details.flowCount).toBe(2);
  });

  it('validates specific flow when flow option provided', () => {
    const result = validateFlow(
      {
        version: 4,
        flows: {
          production: {
            config: { platform: 'web' },
            sources: { browser: { package: '@walkeros/web-source-browser' } },
          },
          staging: {
            config: { platform: 'web' },
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
        version: 4,
        flows: {
          production: {
            config: { platform: 'web' },
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
      flows: { default: { config: { platform: 'web' } } },
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
      version: 4,
      variables: { gaId: 'G-XXX' },
      flows: {
        default: {
          config: { platform: 'web' },
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

  it('warns for dangling $store. references', () => {
    const result = validateFlow({
      version: 4,
      flows: {
        default: {
          config: { platform: 'server' },
          stores: { files: { package: '@walkeros/server-store-fs' } },
          transformers: {
            t: {
              package: '@walkeros/transformer-redact',
              env: { store: '$store.bogus' },
            },
          },
        },
      },
    });

    expect(result.valid).toBe(true);
    expect(
      result.warnings.some((w) => w.message.includes('$store.bogus')),
    ).toBe(true);
  });

  it('warns on colon-instead-of-dot typos ($store:NAME)', () => {
    const result = validateFlow({
      version: 4,
      flows: {
        default: {
          config: { platform: 'server' },
          stores: { files: { package: '@walkeros/server-store-fs' } },
          transformers: {
            t: {
              package: '@walkeros/transformer-redact',
              env: { store: '$store:files' },
            },
          },
        },
      },
    });

    expect(result.valid).toBe(true);
    const warning = result.warnings.find((w) =>
      w.message.includes('$store:files'),
    );
    expect(warning).toBeDefined();
    if (!warning) throw new Error('warning expected');
    expect(warning.message).toMatch(/\$store\.files/);
  });

  it('warns on malformed $env.NAME=default syntax', () => {
    const result = validateFlow({
      version: 4,
      flows: {
        default: {
          config: { platform: 'server' },
          destinations: {
            api: { config: { settings: { url: '$env.API_URL=fallback' } } },
          },
        },
      },
    });

    expect(result.valid).toBe(true);
    expect(
      result.warnings.some((w) => /\$env\.API_URL=fallback/.test(w.message)),
    ).toBe(true);
  });

  it('warns for unknown $flow. references', () => {
    const result = validateFlow({
      version: 4,
      flows: {
        web: {
          config: {
            platform: 'web',
            settings: { backend: '$flow.serverr.url' },
          },
        },
        server: { config: { platform: 'server', url: 'https://api.test' } },
      },
    });

    expect(result.valid).toBe(true);
    expect(result.warnings.some((w) => /\$flow\.serverr/.test(w.message))).toBe(
      true,
    );
  });

  it('warns (not errors) for unresolved $flow.X.url references in soft mode', () => {
    const result = validateFlow({
      version: 4,
      flows: {
        server: { config: { platform: 'server' } }, // no url
        web: {
          config: { platform: 'web' },
          destinations: {
            api: { config: { settings: { url: '$flow.server.url' } } },
          },
        },
      },
    });

    // Without --strict the validator stays valid; warnings are surfaced.
    expect(result.valid).toBe(true);
    expect(
      result.warnings.some((w) => /\$flow\.server\.url/.test(w.message)),
    ).toBe(true);
  });

  it('errors on cyclic $flow references even in soft mode', () => {
    const result = validateFlow({
      version: 4,
      flows: {
        a: {
          config: { platform: 'web', settings: { x: '$flow.b.settings.y' } },
        },
        b: {
          config: {
            platform: 'server',
            settings: { y: '$flow.a.settings.x' },
          },
        },
      },
    });

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === 'FLOW_CYCLE')).toBe(true);
  });

  it('does not warn for valid $var. references', () => {
    const result = validateFlow({
      version: 4,
      variables: { gaId: 'G-XXX' },
      flows: {
        default: {
          config: { platform: 'web' },
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
      version: 4,
      variables: { gaId: 'G-12345', debug: false },
      flows: {
        production: {
          config: {
            platform: 'web',
            bundle: {
              packages: {
                '@walkeros/web-source-browser': { version: '1.0.0' },
                '@walkeros/web-destination-gtag': {},
              },
            },
          },
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
      version: 4,
      flows: {
        default: {
          config: {
            platform: 'web',
            bundle: {
              packages: {
                '@walkeros/collector': {},
              },
            },
          },
        },
      },
    });

    expect(result.warnings).toContainEqual(
      expect.objectContaining({
        path: 'flows.default.config.bundle.packages.@walkeros/collector',
        suggestion: expect.stringContaining('version'),
      }),
    );
  });

  // --- Deep validation (cross-step example checks) ---

  describe('deep validation (cross-step examples)', () => {
    const baseSetup = (overrides: Record<string, unknown> = {}) => ({
      version: 4,
      flows: {
        default: {
          config: { platform: 'web' },
          ...overrides,
        },
      },
    });

    it('passes when connected steps have compatible examples', () => {
      const result = validateFlow(
        baseSetup({
          sources: {
            browser: {
              package: '@walkeros/web-source-browser',
              next: 'enrich',
              examples: {
                pageview: {
                  in: { url: 'https://example.com' },
                  out: {
                    name: 'page view',
                    data: { title: 'Home' },
                    entity: 'page',
                    action: 'view',
                  },
                },
              },
            },
          },
          transformers: {
            enrich: {
              package: '@walkeros/transformer-enricher',
              examples: {
                pageview: {
                  in: {
                    name: 'page view',
                    data: { title: 'Home' },
                    entity: 'page',
                    action: 'view',
                  },
                  out: {
                    name: 'page view',
                    data: { title: 'Home', enriched: true },
                    entity: 'page',
                    action: 'view',
                  },
                },
              },
            },
          },
        }),
      );

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.details.connectionsChecked).toBe(1);
    });

    it('fails when connected steps have incompatible examples', () => {
      const result = validateFlow(
        baseSetup({
          sources: {
            browser: {
              package: '@walkeros/web-source-browser',
              next: 'enrich',
              examples: {
                pageview: {
                  in: { url: 'https://example.com' },
                  out: ['event', 'page_view', { page_title: 'Home' }],
                },
              },
            },
          },
          transformers: {
            enrich: {
              package: '@walkeros/transformer-enricher',
              examples: {
                pageview: {
                  in: {
                    name: 'page view',
                    data: { title: 'Home' },
                    entity: 'page',
                    action: 'view',
                  },
                  out: {
                    name: 'page view',
                    data: { title: 'Home' },
                  },
                },
              },
            },
          },
        }),
      );

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: 'INCOMPATIBLE_EXAMPLES',
        }),
      );
    });

    it('does not warn when steps have no examples', () => {
      const result = validateFlow(
        baseSetup({
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
        }),
      );

      expect(result.valid).toBe(true);
      expect(result.warnings).not.toContainEqual(
        expect.objectContaining({
          message: 'Step has no examples',
        }),
      );
    });

    it('handles transformer chains', () => {
      const result = validateFlow(
        baseSetup({
          transformers: {
            enrich: {
              package: '@walkeros/transformer-enricher',
              next: 'fingerprint',
              examples: {
                event: {
                  in: { name: 'page view', data: {} },
                  out: { name: 'page view', data: { enriched: true } },
                },
              },
            },
            fingerprint: {
              package: '@walkeros/transformer-fingerprint',
              examples: {
                event: {
                  in: { name: 'page view', data: { enriched: true } },
                  out: { name: 'page view', data: { enriched: true } },
                },
              },
            },
          },
        }),
      );

      expect(result.valid).toBe(true);
      expect(result.details.connectionsChecked).toBe(1);
    });

    it('handles destination.before connections', () => {
      const result = validateFlow(
        baseSetup({
          transformers: {
            format: {
              package: '@walkeros/transformer-formatter',
              examples: {
                event: {
                  in: { name: 'page view', data: { title: 'Home' } },
                  out: { name: 'page view', data: { title: 'Home' } },
                },
              },
            },
          },
          destinations: {
            gtag: {
              package: '@walkeros/web-destination-gtag',
              before: 'format',
              examples: {
                pageview: {
                  in: { name: 'page view', data: { title: 'Home' } },
                  out: ['event', 'page_view', { page_title: 'Home' }],
                },
              },
            },
          },
        }),
      );

      expect(result.valid).toBe(true);
      expect(result.details.connectionsChecked).toBe(1);
    });

    it('runs deep checks for specific flow when --flow provided', () => {
      const result = validateFlow(
        {
          version: 4,
          flows: {
            web: {
              config: { platform: 'web' },
              destinations: {
                gtag: {
                  package: '@walkeros/web-destination-gtag',
                  examples: {
                    pageview: {
                      in: { name: 'page view' },
                      out: ['event', 'page_view'],
                    },
                  },
                },
              },
            },
            server: { config: { platform: 'server' } },
          },
        },
        { flow: 'web' },
      );

      expect(result.valid).toBe(true);
    });
  });

  describe('contract compliance (example vs resolved contract)', () => {
    const contractRequiringTotal = {
      default: {
        events: {
          order: {
            complete: {
              type: 'object',
              properties: {
                data: {
                  type: 'object',
                  required: ['total'],
                  properties: { total: { type: 'number' } },
                },
              },
            },
          },
        },
      },
    };

    it('warns when a destination example violates the contract (non-strict)', () => {
      const result = validateFlow({
        version: 4,
        contract: contractRequiringTotal,
        flows: {
          default: {
            config: { platform: 'web' },
            destinations: {
              api: {
                package: '@walkeros/web-destination-api',
                examples: {
                  order: {
                    in: {
                      name: 'order complete',
                      entity: 'order',
                      action: 'complete',
                      data: { id: 'A1' }, // missing required `total`
                    },
                    out: ['event', 'purchase'],
                  },
                },
              },
            },
          },
        },
      });

      // Non-strict: violation is a warning, validation stays valid.
      expect(result.valid).toBe(true);
      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          path: 'destination.api.examples.order.in',
          message: expect.stringContaining('violates contract'),
        }),
      );
    });

    it('errors when a destination example violates the contract (strict)', () => {
      const result = validateFlow(
        {
          version: 4,
          contract: contractRequiringTotal,
          flows: {
            default: {
              config: { platform: 'web' },
              destinations: {
                api: {
                  package: '@walkeros/web-destination-api',
                  examples: {
                    order: {
                      in: {
                        name: 'order complete',
                        entity: 'order',
                        action: 'complete',
                        data: { id: 'A1' },
                      },
                      out: ['event', 'purchase'],
                    },
                  },
                },
              },
            },
          },
        },
        { strict: true },
      );

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          path: 'destination.api.examples.order.in',
          code: 'CONTRACT_VIOLATION',
        }),
      );
    });

    it('does not flag a compliant example', () => {
      const result = validateFlow({
        version: 4,
        contract: contractRequiringTotal,
        flows: {
          default: {
            config: { platform: 'web' },
            destinations: {
              api: {
                package: '@walkeros/web-destination-api',
                examples: {
                  order: {
                    in: {
                      name: 'order complete',
                      entity: 'order',
                      action: 'complete',
                      data: { total: 9.99 },
                    },
                    out: ['event', 'purchase'],
                  },
                },
              },
            },
          },
        },
      });

      expect(result.valid).toBe(true);
      expect(
        result.warnings.some((w) => w.path.includes('destination.api')),
      ).toBe(false);
      expect(result.errors.some((e) => e.code === 'CONTRACT_VIOLATION')).toBe(
        false,
      );
    });

    const uncoveredEventFlow = {
      version: 4,
      contract: contractRequiringTotal,
      flows: {
        default: {
          config: { platform: 'web' },
          destinations: {
            api: {
              package: '@walkeros/web-destination-api',
              examples: {
                page: {
                  in: {
                    name: 'page view',
                    entity: 'page',
                    action: 'view',
                    data: { title: 'Home' },
                  },
                  out: ['event', 'page_view'],
                },
              },
            },
          },
        },
      },
    } as const;

    it('produces no diagnostic when an example matches no contract entry', () => {
      const result = validateFlow(uncoveredEventFlow);

      expect(result.valid).toBe(true);
      expect(
        result.warnings.some((w) => w.path.includes('destination.api')),
      ).toBe(false);
      expect(result.errors.some((e) => e.code === 'CONTRACT_VIOLATION')).toBe(
        false,
      );
    });

    it('does not fail --strict on an uncovered event type', () => {
      const result = validateFlow(uncoveredEventFlow, { strict: true });

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(
        result.warnings.some((w) => w.path.includes('destination.api')),
      ).toBe(false);
    });
  });
});
