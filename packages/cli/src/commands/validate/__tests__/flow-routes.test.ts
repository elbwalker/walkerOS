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
 * Also asserts the CLI-specific closed-schema rules (`UNKNOWN_KEY`,
 * `CONFLICT`) on transformer entries. Empty entries are accepted —
 * pass-through is the default and a no-op step causes no harm.
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

    // No closed-schema errors — both transformers declare `package`.
    expect(result.errors.some((e) => e.code === 'UNKNOWN_KEY')).toBe(false);
    expect(result.errors.some((e) => e.code === 'CONFLICT')).toBe(false);

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

describe('validateFlow — closed-schema rules', () => {
  it('accepts an empty transformer entry (pass-through is the default)', () => {
    // An entry with no fields is a no-op step. Causes no harm; not an error.
    // The closed-schema check (UNKNOWN_KEY) is what catches real typos.
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

    expect(
      result.errors.some((e) => e.path === 'flows.default.transformers.empty'),
    ).toBe(false);
  });

  it('rejects misrouted cache keys at the top of a transformer step', () => {
    // The author forgot the `cache:` wrapper and placed `rules`/`stop` at the
    // top of the transformer entry. Closed schema must reject the unknown keys.
    const flow = {
      version: 4,
      flows: {
        default: {
          config: { platform: 'web' as const },
          transformers: {
            dedupe: { rules: [], stop: true },
          },
        },
      },
    };

    const result = validateFlow(flow);

    expect(result.errors.some((e) => e.code === 'UNKNOWN_KEY')).toBe(true);
  });

  it('rejects a transformer with both code and package', () => {
    // `code` and `package` are mutually exclusive ways to provide a transformer
    // implementation. The closed-schema check must surface a CONFLICT error.
    const flow = {
      version: 4,
      flows: {
        default: {
          config: { platform: 'web' as const },
          transformers: {
            confused: {
              code: '$code:(e) => ({ event: e })',
              package: '@walkeros/x',
            },
          },
        },
      },
    };

    const result = validateFlow(flow);

    expect(result.errors.some((e) => e.code === 'CONFLICT')).toBe(true);
  });

  it('accepts a pass-through step with only `before`', () => {
    // A pass-through step (no code/package) declares only `before` to name a
    // shared chain. Closed-schema rule must not flag it.
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

    expect(
      result.errors.some(
        (e) => e.path === 'flows.default.transformers.chainHead',
      ),
    ).toBe(false);
  });
});
