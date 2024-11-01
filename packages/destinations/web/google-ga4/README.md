# Google Analytics 4 (GA4) web destination for walkerOS

Made to be used with
[walker.js](https://www.npmjs.com/package/@elbwalker/walker.js) from
[walkerOS](https://github.com/elbwalker/walkerOS).

More detailed information and examples can be found in the
[documentation](https://www.elbwalker.com/docs/destinations/web/google-ga4).

## 🤓 Usage

Start by setting up the config for the destination. Optional fields as comments.
Destinations can be used via node or directly in the browser.

## Configuration

Learn more about [destinations](https://www.elbwalker.com/docs/destinations/) in
general and read the detailled
[Google GA4 configuration](https://www.elbwalker.com/docs/destinations/web/ga4#configuration).

```js
const config = {
  custom: {
    measurementId: 'G-XXXXXXXXXX', // Required
    debug: false,
    include: ['globals'],
    items: {},
    pageview: false,
    params: {
      currency: {
        value: 'EUR',
        key: 'data.currency',
      },
      user_id: 'user.id',
    },
    server_container_url: 'https://server.example.com',
    snakeCase: true,
    transport_url: 'https://www.google-analytics.com/g/collect',
  },
  mapping: {
    '*': { '*': {} }, // Process all events
    // entity: { action: { name: 'custom_name' } },
    page: { view: { ignore: true } }, // Ignore page view events, same as pageview: false
    product: {
      add: {
        name: 'add_to_cart', // Rename the product add event to add_to_cart
        custom: {
          // Set parameters for items array
          include: ['all'], // Add all properties to parameters
          items: {
            params: {
              item_id: 'data.id',
              item_category: 'context.category.0', // Value is an array
              quantity: { value: 1, key: 'data.quantity' },
            },
          },
          // Set event parameters
          params: { value: 'data.price' },
        },
      },
      // Add view and other product-related actions
    },
    order: {
      complete: {
        name: 'purchase',
        custom: {
          items: {
            params: {
              // Nested entities are looped and can be used with a wildcard
              // This will add multiple items to the event
              item_id: 'nested.*.data.id',
            },
          },
          params: { transaction_id: 'data.id', value: 'data.revenue' },
        },
      },
    },
  },
};
```

### Node usage

```sh
npm i --save @elbwalker/destination-web-google-ga4
```

```ts
import { elb } from '@elbwalker/walker.js';
import destinationGoogleGA4 from '@elbwalker/destination-web-google-ga4';

elb('walker destination', destinationGoogleGA4, config);
```

## Contribute

Feel free to contribute by submitting an
[issue](https://github.com/elbwalker/walkerOS/issues), starting a
[discussion](https://github.com/elbwalker/walkerOS/discussions) or getting in
[contact](https://calendly.com/elb-alexander/30min).
