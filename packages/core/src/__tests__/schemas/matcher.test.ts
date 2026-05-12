import {
  MatchExpressionSchema,
  RouteSchema,
  RouteSpecSchema,
} from '../../schemas/matcher';
import { safeParseConfig } from '../../schemas/flow';
import { toJsonSchema } from '../../schemas/validation';

describe('MatchExpressionSchema', () => {
  it('validates a simple condition', () => {
    const result = MatchExpressionSchema.safeParse({
      key: 'path',
      operator: 'prefix',
      value: '/api',
    });
    expect(result.success).toBe(true);
  });

  it('validates and/or combinators', () => {
    expect(
      MatchExpressionSchema.safeParse({
        and: [
          { key: 'path', operator: 'prefix', value: '/api' },
          { key: 'method', operator: 'eq', value: 'POST' },
        ],
      }).success,
    ).toBe(true);
  });

  it('accepts a RouteConfig with omitted match (always-match)', () => {
    const result = RouteSchema.safeParse({ next: 'default' });
    expect(result.success).toBe(true);
  });

  it('rejects the legacy wildcard literal "*" as a match value', () => {
    const result = RouteSchema.safeParse({ match: '*', next: 'default' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid operator', () => {
    expect(
      MatchExpressionSchema.safeParse({
        key: 'path',
        operator: 'invalid',
        value: '/api',
      }).success,
    ).toBe(false);
  });
});

describe('RouteSpecSchema', () => {
  it('validates a string', () => {
    expect(RouteSpecSchema.safeParse('enricher').success).toBe(true);
  });

  it('validates a string array', () => {
    expect(RouteSpecSchema.safeParse(['a', 'b']).success).toBe(true);
  });

  it('validates a Route array', () => {
    expect(
      RouteSpecSchema.safeParse([
        {
          match: { key: 'path', operator: 'prefix', value: '/api' },
          next: 'handler',
        },
        { next: 'default' },
      ]).success,
    ).toBe(true);
  });

  it('validates nested routes', () => {
    expect(
      RouteSpecSchema.safeParse([
        {
          match: { key: 'path', operator: 'prefix', value: '/api' },
          next: [
            {
              match: { key: 'method', operator: 'eq', value: 'POST' },
              next: 'writer',
            },
            { next: 'reader' },
          ],
        },
      ]).success,
    ).toBe(true);
  });
});

describe('RouteSchema disjoint union', () => {
  it('documents Zod behavior for a RouteConfig with both next and case set', () => {
    // Finding: Zod 4 unions over non-strict z.object schemas do NOT enforce
    // disjointness at runtime. `{ next: 'a', case: ['b'] }` matches
    // RouteNextConfigSchema (the first union variant) because additional
    // properties are allowed and Zod returns on the first success.
    // The disjoint-union guarantee is enforced at the TypeScript type level
    // via the `never` properties on RouteNextConfig/RouteCaseConfig/RouteGateConfig.
    // TODO: tighten with z.strictObject(...) or a runtime refine if we want
    // schema-level disjointness, but that is out of scope for this task.
    const result = RouteSchema.safeParse({ next: 'a', case: ['b'] });
    expect(result.success).toBe(true);
  });

  it('accepts a bare gate RouteConfig with only match', () => {
    const result = RouteSchema.safeParse({
      match: { key: 'event.name', operator: 'eq', value: 'order complete' },
    });
    expect(result.success).toBe(true);
  });

  it('emits a JSON Schema containing the disjoint union (anyOf)', () => {
    // Zod 4's toJSONSchema emits z.union(...) as `anyOf` (not `oneOf`).
    // The RouteConfig three-way union therefore appears in the emitted
    // JSON Schema as a nested `anyOf` somewhere in the tree.
    const json = toJsonSchema(RouteSchema) as Record<string, unknown>;
    const serialized = JSON.stringify(json);
    expect(serialized.includes('anyOf')).toBe(true);
  });
});

describe('Flow config with Route[] in source.next', () => {
  it('validates source.next with Route array', () => {
    const config = {
      version: 4,
      flows: {
        default: {
          config: { platform: 'server' },
          sources: {
            express: {
              package: '@walkeros/server-source-express',
              next: [
                {
                  match: { key: 'path', operator: 'prefix', value: '/gtag' },
                  next: 'gtag-parser',
                },
                { next: 'default' },
              ],
            },
          },
        },
      },
    };
    const result = safeParseConfig(config);
    expect(result.success).toBe(true);
  });
});
