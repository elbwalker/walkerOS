import { ga4AddToCart } from '../ga4-ecommerce';

describe('walkerOS GA4 Ecommerce Example', () => {
  test('maps a product add event to a GA4 add_to_cart call', async () => {
    const call = await ga4AddToCart();

    expect(call).toEqual([
      'gtag',
      'event',
      'add_to_cart',
      {
        value: 420,
        currency: 'EUR',
        items: [
          { item_id: 'ers', item_name: 'Everyday Ruck Snack', quantity: 1 },
        ],
        send_to: expect.any(String),
      },
    ]);
  });
});
