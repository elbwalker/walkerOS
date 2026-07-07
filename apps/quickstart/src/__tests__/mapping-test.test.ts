import { testMapping } from '../mapping-test';

describe('walkerOS Mapping Example', () => {
  test('renames and reshapes events through destination-level mapping', async () => {
    const { destination } = await testMapping();

    expect(destination).toEqual([
      // Unmapped event: name and data pass through untouched
      { name: 'page view', data: undefined, rule: undefined },
      // product view -> view_item, currency defaults to EUR
      {
        name: 'view_item',
        data: {
          item_id: 'P123',
          item_name: 'Premium Laptop',
          price: 999.99,
          currency: 'EUR',
        },
        rule: 'view_item',
      },
      // product add -> add_to_cart
      {
        name: 'add_to_cart',
        data: { item_id: 'P123', quantity: 2 },
        rule: 'add_to_cart',
      },
      // order complete -> purchase, tax computed as total * 0.1
      {
        name: 'purchase',
        data: {
          transaction_id: 'ORDER-789',
          value: 1000,
          currency: 'EUR',
          tax: 100,
        },
        rule: 'purchase',
      },
    ]);
  });

  test('source-level config.mapping is inert on the direct elb path', async () => {
    const { source } = await testMapping();

    // The event is pushed through the collector elb directly, so it never
    // routes through the custom source and the source's config.mapping is
    // never applied: the event keeps its original name and the hand-rolled
    // source push forwards only the event (dropping the data argument).
    expect(source).toEqual([{ name: 'user login', data: {} }]);
  });
});
