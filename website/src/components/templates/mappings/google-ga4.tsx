import { getEvent } from '@elbwalker/utils';
import { DestinationInit, DestinationPush } from '../destination';

export const GoogleGA4Init: React.FC = () => {
  return (
    <DestinationInit
      custom={`{
    measurementId: 'G-XXXXXXXXXX', // Required
    debug: false,
    include: ['globals'],
    pageview: false,
    data: {
      map: {
        currency: {
          value: 'EUR',
          key: 'data.currency',
        },
      },
    },
    server_container_url: 'https://server.example.com',
    snakeCase: true,
    transport_url: 'https://www.google-analytics.com/g/collect',
  }`}
    />
  );
};

export const GoogleGA4ProductAdd: React.FC = () => {
  return (
    <DestinationPush
      event={getEvent('product add', { custom: {} })}
      mapping={{
        name: 'add_to_cart',
        data: {
          map: {
            currency: { value: 'EUR', key: 'data.currency' },
            value: 'data.price',
            items: {
              loop: [
                'this',
                {
                  map: {
                    item_id: 'data.id',
                    item_variant: 'data.color',
                    quantity: { value: 1, key: 'data.quantity' },
                  },
                },
              ],
            },
          },
        },
      }}
    />
  );
};

export const GoogleGA4OrderComplete: React.FC = () => {
  return (
    <DestinationPush
      event={getEvent('order complete', { custom: {} })}
      // As string to preserve the condition function
      mapping={`{
    name: 'purchase',
    data: {
      map: {
        transaction_id: 'data.id',
        value: 'data.total',
        tax: 'data.taxes',
        shipping: 'data.shipping',
        currency: { key: 'data.currency', value: 'EUR' },
        items: {
          loop: [
            'nested',
            {
              condition: (entity) => entity.type === 'product',
              map: {
                item_id: 'data.id',
                item_name: 'data.name',
                quantity: { key: 'data.quantity', value: 1 },
              },
            },
          ],
        },
      },
    },
  }`}
    />
  );
};
