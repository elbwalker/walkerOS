import { RouteSchema } from '../schemas/matcher';
import { ConfigSchema as DestinationConfigSchema } from '../schemas/destination';
import type { Route, RouteConfig, RouteStopConfig } from '../types/transformer';

const match = { key: 'ingest.x', operator: 'eq', value: '1' } as const;

describe('RouteStopConfig schema', () => {
  it.each<{ name: string; value: unknown }>([
    { name: 'bare stop', value: { stop: true } },
    { name: 'gated stop', value: { match, stop: true } },
    { name: 'stop inside one', value: { one: [{ match, stop: true }, 'b'] } },
    { name: 'stop inside many', value: { many: [{ stop: true }, 'b'] } },
    { name: 'stop inside a sequence', value: ['a', { stop: true }, 'b'] },
    { name: 'stop as a next target', value: { match, next: { stop: true } } },
  ])('accepts $name', ({ value }) => {
    expect(RouteSchema.safeParse(value).success).toBe(true);
  });

  it.each<{ name: string; value: unknown }>([
    { name: 'stop: false', value: { stop: false } },
    { name: 'stop with next', value: { stop: true, next: 'a' } },
    { name: 'stop with one', value: { stop: true, one: ['a'] } },
    { name: 'stop with many', value: { stop: true, many: ['a'] } },
    { name: 'stop: "true"', value: { stop: 'true' } },
  ])('rejects $name', ({ value }) => {
    expect(RouteSchema.safeParse(value).success).toBe(false);
  });
});

describe('many in every chain field', () => {
  const route = { many: ['a', { match, next: 'b' }] };

  it.each(['before', 'next'])(
    'accepts many in a destination config %s',
    (field) => {
      expect(
        DestinationConfigSchema.safeParse({ [field]: route }).success,
      ).toBe(true);
    },
  );

  it('accepts many at depth inside a route', () => {
    expect(
      RouteSchema.safeParse(['a', { one: [{ match, next: route }] }]).success,
    ).toBe(true);
  });
});

describe('RouteStopConfig type', () => {
  it('valid stop shapes are RouteConfig members', () => {
    const bare: RouteStopConfig = { stop: true };
    const gated: RouteStopConfig = { match, stop: true };
    const inOne: RouteConfig = { one: [gated, 'b'] };
    const inMany: RouteConfig = { many: [bare, 'b'] };
    const sequence: Route = ['a', bare, 'b'];
    const routes: Route[] = [bare, gated, inOne, inMany, sequence];
    for (const route of routes) {
      expect(RouteSchema.safeParse(route).success).toBe(true);
    }
  });
});
