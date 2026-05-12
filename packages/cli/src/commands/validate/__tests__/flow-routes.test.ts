/**
 * Tests for the flow validator: route flattening and empty-transformer rule.
 *
 * Indirectly exercises the private `flattenRouteTargets` helper inside
 * `validators/flow.ts` by inspecting `details.connectionsChecked`, which counts
 * connections enumerated by the static graph builder. The graph builder calls
 * `flattenRouteTargets` to resolve each step's `next`/`before` route spec into
 * concrete downstream target IDs and only records a connection when both
 * endpoints expose `examples`.
 *
 * Also asserts the CLI-specific `EMPTY_TRANSFORMER` rule: a transformer entry
 * that declares none of code, package, before, next, or cache is rejected.
 * A "path" entry (only `before`) must pass that rule.
 */

import { validateFlow } from '../validators/flow.js';

describe('validateFlow — route flattening (flattenRouteTargets)', () => {
  it('flattens a case route to all downstream targets', () => {
    // Source.next is a case route fanning out to two transformers, each with
    // examples. The graph builder should enumerate 2 source→transformer
    // connections — proof that `case` was flattened correctly.
    const flow = {
      version: 4,
      flows: {
        default: {
          config: { platform: 'web' as const },
          sources: {
            browser: {
              package: '@walkeros/web-source-browser',
              examples: {
                pageview: {
                  in: { event: 'page view' },
                  out: { entity: 'page', action: 'view' },
                },
              },
              next: {
                case: ['toEnricher', 'toRedactor'],
              },
            },
          },
          transformers: {
            toEnricher: {
              package: '@walkeros/transformer-enricher',
              examples: {
                pass: {
                  in: { entity: 'page', action: 'view' },
                  out: { entity: 'page', action: 'view' },
                },
              },
            },
            toRedactor: {
              package: '@walkeros/transformer-redactor',
              examples: {
                pass: {
                  in: { entity: 'page', action: 'view' },
                  out: { entity: 'page', action: 'view' },
                },
              },
            },
          },
        },
      },
    };

    const result = validateFlow(flow);

    // No EMPTY_TRANSFORMER errors — both transformers declare `package`.
    expect(result.errors.some((e) => e.code === 'EMPTY_TRANSFORMER')).toBe(
      false,
    );

    // Two connections enumerated, one per branch of the case.
    expect(result.details.connectionsChecked).toBe(2);
  });

  it('flattens a bare-gate route to no targets', () => {
    // Source.next is a bare gate (only `match`, no `next`/`case`). The graph
    // builder should enumerate 0 connections from the source — proof that a
    // gate without targets is correctly flattened to an empty list.
    const flow = {
      version: 4,
      flows: {
        default: {
          config: { platform: 'web' as const },
          sources: {
            browser: {
              package: '@walkeros/web-source-browser',
              examples: {
                pageview: {
                  in: { event: 'page view' },
                  out: { entity: 'page', action: 'view' },
                },
              },
              next: {
                match: { key: 'event', operator: 'eq', value: 'page view' },
              },
            },
          },
          // A transformer is defined but is unreachable via the bare gate.
          // It must not be wired up via source.next flattening.
          transformers: {
            toEnricher: {
              package: '@walkeros/transformer-enricher',
              examples: {
                pass: {
                  in: { entity: 'page', action: 'view' },
                  out: { entity: 'page', action: 'view' },
                },
              },
            },
          },
        },
      },
    };

    const result = validateFlow(flow);

    // No schema errors for a valid bare-gate route.
    expect(
      result.errors.filter((e) => e.code === 'SCHEMA_VALIDATION'),
    ).toHaveLength(0);

    // Bare gate has no downstream targets, so no connections are checked.
    expect(result.details.connectionsChecked).toBe(0);
  });
});

describe('validateFlow — EMPTY_TRANSFORMER rule', () => {
  it('errors on a transformer entry that declares no operative field', () => {
    // The `empty` transformer has none of code/package/before/next/cache.
    // The CLI-specific rule must produce an EMPTY_TRANSFORMER error.
    const flow = {
      version: 4,
      flows: {
        default: {
          config: { platform: 'web' as const },
          transformers: {
            empty: {},
          },
        },
      },
    };

    const result = validateFlow(flow);

    const emptyErrors = result.errors.filter(
      (e) => e.code === 'EMPTY_TRANSFORMER',
    );
    expect(emptyErrors).toHaveLength(1);
    expect(emptyErrors[0].path).toBe('flows.default.transformers.empty');
    expect(result.valid).toBe(false);
  });

  it('accepts a path entry (only `before`) without EMPTY_TRANSFORMER', () => {
    // A "path" entry is a routing-only transformer that declares only `before`
    // (a downstream chain). It has no `code`/`package` of its own. The rule
    // must NOT flag it as empty.
    const flow = {
      version: 4,
      flows: {
        default: {
          config: { platform: 'web' as const },
          transformers: {
            chainHead: {
              before: ['toEnricher'],
            },
            toEnricher: {
              package: '@walkeros/transformer-enricher',
            },
          },
        },
      },
    };

    const result = validateFlow(flow);

    expect(result.errors.some((e) => e.code === 'EMPTY_TRANSFORMER')).toBe(
      false,
    );
  });
});
