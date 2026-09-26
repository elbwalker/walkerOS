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
    expect(result.details.scope).toMatchObject({ flows: ['production'] });
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
      expect(result.warnings).not.toContainEqual(
        expect.objectContaining({
          message: 'Cannot check compatibility: missing out or in examples',
        }),
      );
    });

    it('warns instead of erroring when the next step has only command examples', () => {
      const result = validateFlow(
        baseSetup({
          sources: {
            browser: {
              package: '@walkeros/web-source-browser',
              next: 'enrich',
              examples: {
                pageview: {
                  in: { url: 'https://example.com' },
                  out: { name: 'page view', data: { title: 'Home' } },
                },
              },
            },
          },
          transformers: {
            enrich: {
              package: '@walkeros/transformer-enricher',
              examples: {
                grant: {
                  command: 'consent',
                  in: { marketing: true },
                },
              },
            },
          },
        }),
      );

      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          message: 'Cannot check compatibility: missing out or in examples',
        }),
      );
    });

    it('fails when an object out is incompatible with the next in', () => {
      const result = validateFlow(
        baseSetup({
          sources: {
            browser: {
              package: '@walkeros/web-source-browser',
              next: 'enrich',
              examples: {
                pageview: {
                  in: { url: 'https://example.com' },
                  out: { url: 'https://example.com', referrer: '' },
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

  describe('contract binding through validate steps', () => {
    const contracts = {
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
      server: {
        extend: 'default',
        schema: {
          type: 'object',
          required: ['user'],
          properties: {
            user: { type: 'object', required: ['hash'] },
          },
        },
      },
    };

    const withHash = {
      name: 'order complete',
      entity: 'order',
      action: 'complete',
      data: { total: 9.99 },
      user: { hash: 'h1' },
      source: { type: 'express' },
    };
    const withoutHash = {
      name: 'order complete',
      entity: 'order',
      action: 'complete',
      data: { total: 9.99 },
      user: {},
      source: { type: 'express' },
    };
    const markValid = (
      event: typeof withHash | typeof withoutHash,
      valid: boolean,
    ) => ({ ...event, source: { ...event.source, valid } });

    const metaWithoutHash = {
      package: '@walkeros/server-destination-meta',
      examples: {
        order: { in: withoutHash, out: [['sendServer', 'x']] },
      },
    };

    function config(opts: {
      webExampleWithoutHash?: boolean;
      metaExampleWithoutHash?: boolean;
      noValidateStep?: boolean;
      mode?: 'strict' | 'pass';
      validateExample?: { in: unknown; out: unknown };
      contractSetting?: unknown;
    }) {
      const contractSetting: unknown = opts.contractSetting ?? [
        '$contract.server',
      ];
      const validate = {
        package: '@walkeros/transformer-validate',
        config: {
          settings: {
            contract: contractSetting,
            ...(opts.mode ? { mode: opts.mode } : {}),
          },
        },
        ...(opts.validateExample
          ? { examples: { example: opts.validateExample } }
          : {}),
      };
      return {
        version: 4,
        contract: contracts,
        flows: {
          web: {
            config: { platform: 'web' },
            destinations: opts.webExampleWithoutHash
              ? {
                  api: {
                    package: '@walkeros/web-destination-api',
                    examples: {
                      order: { in: withoutHash, out: [['sendWeb', 'x']] },
                    },
                  },
                }
              : {},
          },
          server: {
            config: { platform: 'server' },
            transformers: opts.noValidateStep ? {} : { validate },
            destinations: opts.metaExampleWithoutHash
              ? { meta: metaWithoutHash }
              : {},
          },
        },
      };
    }

    const violations = (result: ReturnType<typeof validateFlow>) =>
      result.errors.filter((e) => e.code === 'CONTRACT_VIOLATION');

    it('never checks a step that is not a validate step', () => {
      const result = validateFlow(
        config({ webExampleWithoutHash: true, metaExampleWithoutHash: true }),
        { strict: true },
      );
      expect(violations(result)).toEqual([]);
    });

    it('accepts a validate example whose out shows the failure its contract produces', () => {
      const result = validateFlow(
        config({
          validateExample: {
            in: withoutHash,
            out: [['return', { event: markValid(withoutHash, false) }]],
          },
        }),
        { strict: true },
      );
      expect(violations(result)).toEqual([]);
    });

    it('accepts a strict-mode drop for an event that breaks the contract', () => {
      const result = validateFlow(
        config({
          mode: 'strict',
          validateExample: { in: withoutHash, out: [['return', false]] },
        }),
        { strict: true },
      );
      expect(violations(result)).toEqual([]);
    });

    it('accepts a validate example whose out passes a valid event on', () => {
      const result = validateFlow(
        config({
          validateExample: {
            in: withHash,
            out: [['return', { event: withHash }]],
          },
        }),
        { strict: true },
      );
      expect(violations(result)).toEqual([]);
    });

    it('flags a validate example whose out claims the wrong verdict', () => {
      const result = validateFlow(
        config({
          validateExample: {
            in: withoutHash,
            out: [['return', { event: withoutHash }]],
          },
        }),
        { strict: true },
      );
      expect(result.errors.map((e) => e.path)).toContain(
        'flows.server.transformers.validate.examples.example.out',
      );
    });

    const wrongVerdicts: Array<
      [string, 'strict' | 'pass', typeof withHash | typeof withoutHash, unknown]
    > = [
      ['a drop of a valid event', 'strict', withHash, [['return', false]]],
      [
        'valid false on a valid event',
        'pass',
        withHash,
        [['return', { event: markValid(withHash, false) }]],
      ],
      [
        'a strict-mode pass of an invalid event',
        'strict',
        withoutHash,
        [['return', { event: markValid(withoutHash, false) }]],
      ],
    ];

    it.each(wrongVerdicts)('flags %s', (_label, mode, input, out) => {
      const result = validateFlow(
        config({ mode, validateExample: { in: input, out } }),
        { strict: true },
      );
      expect(violations(result).map((e) => e.path)).toEqual([
        'flows.server.transformers.validate.examples.example.out',
      ]);
    });

    it('reports a wrong verdict as a warning without --strict', () => {
      const result = validateFlow(
        config({
          validateExample: {
            in: withoutHash,
            out: [['return', { event: withoutHash }]],
          },
        }),
      );
      expect(violations(result)).toEqual([]);
      expect(result.warnings.map((w) => w.path)).toContain(
        'flows.server.transformers.validate.examples.example.out',
      );
    });

    it('skips a validate step whose contract setting is not a list', () => {
      const result = validateFlow(
        config({
          contractSetting: '$contract.server',
          validateExample: {
            in: withoutHash,
            out: [['return', { event: markValid(withoutHash, false) }]],
          },
        }),
        { strict: true },
      );
      expect(violations(result)).toEqual([]);
    });

    it('checks nothing in a config without validate steps, even with a contract block', () => {
      const result = validateFlow(
        config({ noValidateStep: true, metaExampleWithoutHash: true }),
        { strict: true },
      );
      expect(violations(result)).toEqual([]);
    });

    it('keeps the contract block as the IntelliSense reference', () => {
      const result = validateFlow(
        config({ noValidateStep: true, metaExampleWithoutHash: true }),
        { strict: true },
      );
      expect(result.details.context).toEqual(
        expect.objectContaining({
          contract: expect.arrayContaining([
            expect.objectContaining({ entity: 'order' }),
          ]),
        }),
      );
    });
  });

  describe('StepOut compare', () => {
    const event = {
      name: 'page view',
      entity: 'page',
      action: 'view',
      data: { id: '/' },
    };

    function chain(opts: { out: unknown; nextIn: unknown }) {
      return {
        version: 4,
        flows: {
          default: {
            config: { platform: 'server' },
            sources: {
              x: {
                package: '@walkeros/server-source-express',
                next: 't',
                examples: { a: { in: { path: '/' }, out: opts.out } },
              },
            },
            transformers: {
              t: {
                package: '@walkeros/transformer-enricher',
                examples: { b: { in: opts.nextIn, out: [['return', event]] } },
              },
            },
          },
        },
      };
    }

    it.each([
      ['source elb StepOut', [['elb', event]]],
      ['transformer return {event}', [['return', { event }]]],
      ['transformer return bare event', [['return', event]]],
      ['transformer return fan-out', [['return', [{ event }, { event }]]]],
      [
        'an effect list with a non-event head first',
        [
          ['response', { status: 200 }],
          ['elb', event],
        ],
      ],
      ['bare event (back compat)', event],
    ])('accepts %s against a matching in', (_label, out) => {
      const result = validateFlow(chain({ out, nextIn: event }), {
        strict: true,
      });
      expect(
        result.errors.filter((e) => e.code === 'INCOMPATIBLE_EXAMPLES'),
      ).toEqual([]);
      expect(
        result.warnings.some((w) =>
          w.message.includes('missing out or in examples'),
        ),
      ).toBe(false);
    });

    it.each([
      ['return false', [['return', false]]],
      ['response only', [['response', { status: 200 }]]],
      ['message.ack only', [['message.ack']]],
      ['an empty effect list', []],
    ])('treats %s as no comparable out (warning, not error)', (_label, out) => {
      const result = validateFlow(chain({ out, nextIn: event }), {
        strict: false,
      });
      expect(
        result.errors.filter((e) => e.code === 'INCOMPATIBLE_EXAMPLES'),
      ).toEqual([]);
      expect(
        result.warnings.some((w) =>
          w.message.includes('missing out or in examples'),
        ),
      ).toBe(true);
    });

    it('still rejects a StepOut whose event does not match the next in', () => {
      const result = validateFlow(
        chain({
          out: [['return', { event: { foo: 1, bar: 2 } }]],
          nextIn: event,
        }),
        { strict: true },
      );
      expect(
        result.errors.some((e) => e.code === 'INCOMPATIBLE_EXAMPLES'),
      ).toBe(true);
    });
  });
});
