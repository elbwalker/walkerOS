import { DestinationSchema } from '../../schemas/flow';

describe('destination.before rejects many (post-collector restriction)', () => {
  it('rejects many at destination.before', () => {
    const result = DestinationSchema.safeParse({
      package: '@walkeros/server-destination-spy',
      before: { many: ['a', 'b'] },
    });
    expect(result.success).toBe(false);
  });

  it('accepts one at destination.before', () => {
    const result = DestinationSchema.safeParse({
      package: '@walkeros/server-destination-spy',
      before: {
        one: [
          {
            match: { key: 'event.name', operator: 'eq', value: 'x' },
            next: 'a',
          },
        ],
      },
    });
    expect(result.success).toBe(true);
  });

  it('accepts next at destination.before', () => {
    const result = DestinationSchema.safeParse({
      package: '@walkeros/server-destination-spy',
      before: { next: 'a' },
    });
    expect(result.success).toBe(true);
  });

  it('accepts nested many inside one is still rejected at destination.before', () => {
    // many is forbidden at any depth in a post-collector route.
    const result = DestinationSchema.safeParse({
      package: '@walkeros/server-destination-spy',
      before: {
        one: [
          {
            match: { key: 'x', operator: 'eq', value: 'a' },
            next: { many: ['p', 'q'] },
          },
        ],
      },
    });
    expect(result.success).toBe(false);
  });
});
