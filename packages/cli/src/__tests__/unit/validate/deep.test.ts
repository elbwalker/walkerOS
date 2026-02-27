import { describe, it, expect } from '@jest/globals';
import { validateDeep } from '../../../commands/validate/validators/deep.js';

describe('validateDeep', () => {
  const baseSetup = (overrides: Record<string, unknown> = {}) => ({
    version: 1,
    flows: {
      default: {
        web: {},
        ...overrides,
      },
    },
  });

  it('passes when connected steps have compatible examples', () => {
    const result = validateDeep(
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
    const result = validateDeep(
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

  it('warns when steps have no examples', () => {
    const result = validateDeep(
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
    expect(result.warnings).toContainEqual(
      expect.objectContaining({
        path: 'source.browser',
        message: 'Step has no examples',
      }),
    );
    expect(result.warnings).toContainEqual(
      expect.objectContaining({
        path: 'destination.gtag',
        message: 'Step has no examples',
      }),
    );
  });

  it('skips out: false examples in compatibility checks', () => {
    const result = validateDeep(
      baseSetup({
        sources: {
          browser: {
            package: '@walkeros/web-source-browser',
            next: 'filter',
            examples: {
              filtered: {
                in: { url: 'https://internal.com' },
                out: false,
              },
              valid: {
                in: { url: 'https://example.com' },
                out: {
                  name: 'page view',
                  data: { title: 'Home' },
                  entity: 'page',
                },
              },
            },
          },
        },
        transformers: {
          filter: {
            package: '@walkeros/transformer-validator',
            examples: {
              pageview: {
                in: { name: 'page view', data: {}, entity: 'page' },
                out: { name: 'page view', data: {}, entity: 'page' },
              },
            },
          },
        },
      }),
    );

    // The 'valid' example out matches the transformer in, so should pass
    expect(result.valid).toBe(true);
    expect(result.details.connectionsChecked).toBe(1);
  });

  it('handles transformer chains', () => {
    const result = validateDeep(
      baseSetup({
        transformers: {
          enrich: {
            package: '@walkeros/transformer-enricher',
            next: 'validate',
            examples: {
              event: {
                in: { name: 'page view', data: {} },
                out: { name: 'page view', data: { enriched: true } },
              },
            },
          },
          validate: {
            package: '@walkeros/transformer-validator',
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
    const result = validateDeep(
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

  it('warns on missing out/in for connected steps', () => {
    const result = validateDeep(
      baseSetup({
        sources: {
          browser: {
            package: '@walkeros/web-source-browser',
            next: 'enrich',
            examples: {
              pageview: {
                in: { url: 'https://example.com' },
                // No out defined
              },
            },
          },
        },
        transformers: {
          enrich: {
            package: '@walkeros/transformer-enricher',
            examples: {
              event: {
                in: { name: 'page view' },
                out: { name: 'page view' },
              },
            },
          },
        },
      }),
    );

    expect(result.valid).toBe(true);
    expect(result.warnings).toContainEqual(
      expect.objectContaining({
        message: 'Cannot check compatibility: missing out or in examples',
      }),
    );
  });

  it('requires --flow for multi-flow configs', () => {
    const result = validateDeep({
      version: 1,
      flows: {
        web: { web: {} },
        server: { server: {} },
      },
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        code: 'AMBIGUOUS_FLOW',
      }),
    );
  });

  it('selects specific flow with --flow option', () => {
    const result = validateDeep(
      {
        version: 1,
        flows: {
          web: {
            web: {},
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
          server: { server: {} },
        },
      },
      { flow: 'web' },
    );

    expect(result.valid).toBe(true);
    expect(result.details.flow).toBe('web');
  });

  it('warns about contract compliance', () => {
    const result = validateDeep({
      version: 1,
      contract: {
        page: {
          view: {
            type: 'object',
            properties: { title: { type: 'string' } },
          },
        },
      },
      flows: {
        default: {
          web: {},
          destinations: {
            gtag: {
              package: '@walkeros/web-destination-gtag',
              examples: {
                pageview: {
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
    });

    expect(result.valid).toBe(true);
    expect(result.warnings).toContainEqual(
      expect.objectContaining({
        path: 'destination.gtag.examples.pageview',
        message: expect.stringContaining('contract'),
      }),
    );
  });

  it('handles single-flow configs without --flow', () => {
    const result = validateDeep(
      baseSetup({
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
      }),
    );

    expect(result.valid).toBe(true);
    expect(result.details.flow).toBe('default');
  });
});
