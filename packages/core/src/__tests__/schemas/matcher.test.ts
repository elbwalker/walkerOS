import {
  MatchExpressionSchema,
  RouteSchema,
  RouteSpecSchema,
} from '../../schemas/matcher';
import { safeParseConfig } from '../../schemas/flow';

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

  it('validates wildcard string', () => {
    const result = RouteSchema.safeParse({ match: '*', next: 'default' });
    expect(result.success).toBe(true);
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
        { match: '*', next: 'default' },
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
            { match: '*', next: 'reader' },
          ],
        },
      ]).success,
    ).toBe(true);
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
                { match: '*', next: 'default' },
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
