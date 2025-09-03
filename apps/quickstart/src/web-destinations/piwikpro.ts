import { createCollector } from '@walkeros/collector';
import { destinationPiwikPro } from '@walkeros/web-destination-piwikpro';
import type { WalkerOS, Collector } from '@walkeros/core';

export async function setupPiwikPro(): Promise<{
  collector: Collector.Instance;
  elb: WalkerOS.Elb;
}> {
  const { collector, elb } = await createCollector({
    destinations: {
      piwikpro: {
        code: destinationPiwikPro,
        config: {
          settings: {
            appId: 'XXX-XXX-XXX-XXX-XXX',
            url: 'https://your-instance.piwik.pro/',
          },
          mapping: {
            // Product view to ecommerceProductDetailView
            product: {
              view: {
                name: 'ecommerceProductDetailView',
                data: {
                  set: [
                    {
                      set: [
                        {
                          map: {
                            sku: 'data.id',
                            name: 'data.name',
                            price: 'data.price',
                            quantity: { value: 1 },
                          },
                        },
                      ],
                    },
                    {
                      map: {
                        currencyCode: { value: 'EUR' },
                      },
                    },
                  ],
                },
              },
              // Product add to ecommerceAddToCart
              add: {
                name: 'ecommerceAddToCart',
                data: {
                  set: [
                    {
                      set: [
                        {
                          map: {
                            sku: 'data.id',
                            name: 'data.name',
                            price: 'data.price',
                            quantity: { value: 1 },
                          },
                        },
                      ],
                    },
                    {
                      map: {
                        currencyCode: { value: 'EUR' },
                      },
                    },
                  ],
                },
              },
            },
            // Order complete to ecommerceOrder
            order: {
              complete: {
                name: 'ecommerceOrder',
                data: {
                  set: [
                    {
                      map: {
                        orderId: 'data.id',
                        grandTotal: 'data.total',
                        currencyCode: { value: 'EUR' },
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
  });

  return { collector, elb };
}

export async function trackPiwikProEvents(elb: WalkerOS.Elb): Promise<void> {
  await elb('product view', {
    id: 'SKU-123',
    name: 'Blue T-Shirt',
    price: 29.99,
  });

  await elb('product add', {
    id: 'SKU-456',
    name: 'Red Shoes',
    price: 89.99,
  });

  await elb('order complete', {
    id: 'order-789',
    total: 149.99,
  });
}
