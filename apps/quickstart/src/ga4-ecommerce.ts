import { startFlow } from '@walkeros/collector';
import { destinationGtag } from '@walkeros/web-destination-gtag';

/**
 * Maps a `product add` event to the GA4 `add_to_cart` event.
 *
 * Demonstrates an in-flow nested mapping: the product price becomes the GA4
 * value, the currency falls back to EUR, and the product is shaped into a GA4
 * items array via a `this` loop.
 *
 * Returns the captured gtag('event', 'add_to_cart', ...) call. gtag is injected
 * through the destination's `env.window.gtag` seam (sibling to `config`), which
 * is the same capture seam the gtag destination's own tests use.
 */
export async function ga4AddToCart(): Promise<unknown[]> {
  const calls: unknown[][] = [];
  const { elb } = await startFlow({
    destinations: {
      ga4: {
        code: destinationGtag,
        config: {
          settings: { ga4: { measurementId: 'G-XXXXXXXXXX' } },
          mapping: {
            product: {
              add: {
                name: 'add_to_cart',
                data: {
                  map: {
                    value: 'data.price',
                    currency: { value: 'EUR', key: 'data.currency' },
                    items: {
                      loop: [
                        'this',
                        {
                          map: {
                            item_id: 'data.id',
                            item_name: 'data.name',
                            quantity: { value: 1, key: 'data.quantity' },
                          },
                        },
                      ],
                    },
                  },
                },
              },
            },
          },
        },
        env: {
          window: {
            gtag: (...args: unknown[]) => calls.push(['gtag', ...args]),
          },
        },
      },
    },
  });

  await elb('product add', {
    id: 'ers',
    name: 'Everyday Ruck Snack',
    price: 420,
  });

  // The destination's init emits gtag('js', ...) and gtag('config', ...) first,
  // so pick the add_to_cart event call rather than the first captured call.
  return (
    calls.find((call) => call[1] === 'event' && call[2] === 'add_to_cart') ?? []
  );
}

export default ga4AddToCart;
