---
title: Google Analytics 4 (GA4)
---

##### How to send events to Google Analytics 4 (GA4) via walker.js

| Destination                                                | Source Code                                                                                                                                                 |
|------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------|
| [Google Analytics 4 (GA4)](https://docs.elbwalker.com/destinations/details/google-analytics-4-ga4) | [Source Code](https://github.com/elbwalker/walker.js/tree/main/destinations/google-ga4), [NPM](https://www.npmjs.com/package/@elbwalker/destination-web-google-ga4) |

## What is Google Analytics 4 (GA4)?

[Google Analytics 4](https://marketingplatform.google.com/about/) is the current version of Google's marketing measurement software. It's the most common analytics tool for tracking conversions and user behavior on websites.

## Configuration

Start by setting up the config for the destination. Optional fields as comments. Destinations can be used via node or directly in the browser.

```js
import { DestinationGoogleGA4 } from '@elbwalker/destination-web-google-ga4';

const config /* : DestinationGoogleGA4.Config */ = {
  // consent: { marketing: true }, // Neccessary consent states
  custom: {
    // debug: true, // Enable debug mode
    // include: ['globals'], // Add globals to parameters
    // items: {}, // Set item properties for every event
    measurementId: 'G-XXXXXX-1', // Required
    // pageview: false, // Disable the default pageview event
    // params: {
    //   // Set event parameters for every event
    //   currency: {
    //     default: 'EUR', // Default value if key is undefined or non-existent
    //     key: 'data.currency', // Access value from event.data.currency
    //   },
    //   user_id: 'user.id', // Set a custom user id
    // },
    // snakeCase: false, // disable the auto snake_case renaming
    // transport_url: '', // Endpoint where to send data to
  },
  // init: true, // Skip the initialisation
  // loadScript: true, // Load additional required scripts on init
  // mapping: {
  //   // Only defined events get processed if mapping is used
  //   '*': { '*': {} }, // Process all events
  //   // entity: { action: { name: 'custom_name' } },
  //   page: { view: { ignore: true } }, // Ignore page view events
  //   product: {
  //     add: {
  //       name: 'add_to_cart', // Rename the product add event to add_to_cart
  //       custom: {
  //         // Set parameters for items array
  //         include: ['all'], // Add all properties to parameters
  //         items: {
  //           params: {
  //             item_id: 'data.id',
  //             item_category: 'context.category.0', // Value is an array
  //             quantity: { default: 1, key: 'data.quantity' },
  //           },
  //         },
  //         // Set event parameters
  //         params: { value: 'data.price' },
  //       },
  //     },
  //     // Add view and other product-related actions
  //   },
  //   order: {
  //     complete: {
  //       name: 'purchase',
  //       custom: {
  //         items: {
  //           params: {
  //             // Nested entities are looped and can be used with a wildcard
  //             // This will add multiple items to the event
  //             item_id: 'nested.*.data.id',
  //           },
  //         },
  //         params: { transaction_id: 'data.id', value: 'data.revenue' },
  //       },
  //     },
  //   },
  // },
};
```

`params`, `items`, and `include` are available at the config and event levels. Settings on the event level will override the general ones.
Use the `string-dot` notation (`data.id`, `user.id`, `group`, `context.position.0`) to access all values of an event.

Nested entities will be looped if available. Use `items` and the wildcard (*) to access and add them dynamically (for `order complete` events with multiple nested `product` entities for example).

Use the `include` option to bulk-add event properties without explicitly mapping custom event parameters. This adds all available properties of the specified group. Available groups are `event` (for basic event properties like trigger, timing, etc.), `data`, `context`, `globals`, `user`, or just all. All data properties are added automatically by default. If you don't want this add `include: []`. Note: `nested`, `consent`, `version`, and `source` are not available, but you can add them explicitly using `params` or `items`. The properties get prefixed with the group's name and underscore (like `globals_lang` for `{ globals: { lang: 'de' } }`). Custom parameters will override `include` values with the same key.

### Node usage

```js
npm i --save @elbwalker/destination-web-google-ga4
```

```js
import { elb } from '@elbwalker/walker.js';
import destinationGoogleGA4 from '@elbwalker/destination-web-google-ga4';

elb('walker destination', destinationGoogleGA4, config);
```

### Browser usage

Loading the destination via dynamic import

```html
<script>
  // Make sure to initialize the elb function once.
  function elb() {
    (window.elbLayer = window.elbLayer || []).push(arguments);
  }

  // Upload the dist/index.mjs on your own server
  const destination = (
    await import(
      'https://cdn.jsdelivr.net/npm/@elbwalker/destination-web-google-ga4/dist/index.mjs'
    )
  ).default;

  elb('walker destination', destination, config);
</script>
```