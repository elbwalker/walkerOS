import { simulateDestination } from '../simulate';

describe('simulateDestination', () => {
  it('calls destination push with event', async () => {
    const received: unknown[] = [];

    const result = await simulateDestination({
      event: { name: 'product add', data: { name: 'Shirt', price: 29 } },
      code: {
        type: 'test-dest',
        config: {},
        push(event, context) {
          received.push({ event, data: context.data });
        },
      },
      config: {
        mapping: {
          'product add': {
            name: 'add_to_cart',
          },
        },
      },
    });

    expect(result.collector).toBeDefined();
    expect(received.length).toBe(1);
    await result.collector.command('shutdown');
  });

  it('works without mapping', async () => {
    const received: unknown[] = [];

    const result = await simulateDestination({
      event: { name: 'page view', data: { title: 'Home' } },
      code: {
        type: 'test-dest',
        config: {},
        push(event) {
          received.push(event);
        },
      },
    });

    expect(received.length).toBe(1);
    await result.collector.command('shutdown');
  });
});
