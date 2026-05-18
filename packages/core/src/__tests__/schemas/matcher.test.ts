import { MatchExpressionSchema, RouteSchema } from '../../schemas/matcher';
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

describe('RouteSchema — basic shapes', () => {
  it('validates a string', () => {
    expect(RouteSchema.safeParse('enricher').success).toBe(true);
  });

  it('validates a string array', () => {
    expect(RouteSchema.safeParse(['a', 'b']).success).toBe(true);
  });

  it('validates a Route array', () => {
    expect(
      RouteSchema.safeParse([
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
      RouteSchema.safeParse([
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
  it('rejects a RouteConfig with both next and one set', () => {
    const result = RouteSchema.safeParse({ next: 'a', one: ['b'] });
    expect(result.success).toBe(false);
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

describe('RouteSchema — one/many operators', () => {
  it('accepts { one: [...] } and rejects { case: [...] }', () => {
    expect(RouteSchema.safeParse({ one: ['a'] }).success).toBe(true);
    expect(RouteSchema.safeParse({ case: ['a'] }).success).toBe(false);
  });

  it('accepts { many: [...] }', () => {
    expect(RouteSchema.safeParse({ many: ['a', 'b'] }).success).toBe(true);
  });

  it('rejects both `next` and `one` set on the same RouteConfig', () => {
    expect(RouteSchema.safeParse({ next: 'a', one: ['b'] }).success).toBe(
      false,
    );
  });

  it('accepts empty many: [] (lint surfaces the warning, schema does not)', () => {
    expect(RouteSchema.safeParse({ many: [] }).success).toBe(true);
  });

  it('accepts nested `many` inside a gated entry', () => {
    expect(
      RouteSchema.safeParse({
        match: { key: 'ingest.path', operator: 'prefix', value: '/api' },
        many: ['audit', 'process'],
      }).success,
    ).toBe(true);
  });
});
