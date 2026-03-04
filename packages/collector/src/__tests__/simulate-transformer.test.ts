import { simulateTransformer } from '../simulate';

describe('simulateTransformer', () => {
  it('returns transformed event', async () => {
    const result = await simulateTransformer({
      event: { name: 'page view', data: { title: 'Home' } },
      code: () => ({
        type: 'enricher',
        config: {},
        push(event) {
          return { ...event, data: { ...event.data, enriched: true } };
        },
      }),
    });

    expect(result.transformedEvent).toMatchObject({
      data: { title: 'Home', enriched: true },
    });
  });

  it('returns false when transformer stops chain', async () => {
    const result = await simulateTransformer({
      event: { name: 'spam event' },
      code: () => ({
        type: 'filter',
        config: {},
        push() {
          return false;
        },
      }),
    });

    expect(result.transformedEvent).toBe(false);
  });

  it('returns void for passthrough transformer', async () => {
    const result = await simulateTransformer({
      event: { name: 'page view' },
      code: () => ({
        type: 'logger',
        config: {},
        push() {
          // no return = void = passthrough
        },
      }),
    });

    expect(result.transformedEvent).toBeUndefined();
  });
});
