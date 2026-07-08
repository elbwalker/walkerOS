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

  test('renames and reshapes events through source-level mapping', async () => {
    const { source } = await testMapping();

    // Pushed through the source instance, so the source's config.mapping runs:
    // user login -> user authenticated, and policy adds the normalized
    // `method` field to the event data that flows downstream.
    expect(source).toEqual([
      {
        name: 'user authenticated',
        data: { id: 'user-456', loginMethod: 'google', method: 'google' },
      },
    ]);
  });
});
