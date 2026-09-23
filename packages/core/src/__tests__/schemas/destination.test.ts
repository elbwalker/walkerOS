import { DestinationSchema } from '../../schemas/flow';

describe('destination.before accepts every route operator', () => {
  it('accepts many at destination.before', () => {
    const result = DestinationSchema.safeParse({
      package: '@walkeros/server-destination-spy',
      before: { many: ['a', 'b'] },
    });
    expect(result.success).toBe(true);
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

  it('accepts many at destination.next', () => {
    const result = DestinationSchema.safeParse({
      package: '@walkeros/server-destination-spy',
      next: { many: ['a', 'b'] },
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

  it('accepts nested many inside one at destination.before', () => {
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
    expect(result.success).toBe(true);
  });
});
