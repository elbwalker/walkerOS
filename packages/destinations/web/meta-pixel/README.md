# Meta Pixel (former Facebook Pixel) web destination for walker.js

Made to be used with [@elbwalker/walker.js](https://github.com/elbwalker/walker.js).

More detailed information and examples can be found in the [documentation](https://docs.elbwalker.com/).

## 🤓 Usage

Start by setting up the config for the destination. Optional fields as comments.
Destinations can be used via node or directly in the browser.

## Configuration

```ts
import { DestinationMeta } from '@elbwalker/destination-web-meta-pixel';

const config /* : DestinationMeta.Config */ = {
  // consent: { marketing: true }, // Neccessary consent states
  custom: {
    pixelId: '1234567890', // The ads accounts id used for every conversion
    // currency: 'EUR', // Default currency is EUR
    // pageview: true, // Send the PageView event (default yes, deactivate actively)
  },
  // init: true, // Skip the initialisation
  // loadScript: true, // Load additional required scripts on init
  mapping: {
    // e.g. order
    entity: {
      // e.g. complete
      action: {
        custom: {
          track: 'Purchase', // Name of a standard event to track
          // id: 'data.order_id', // For content_ids, use * for arrays like "nested.*.quantity"
          // name: 'data.title', // Key to use as content_name
          contents: {
            // Both, id and quantity are required
            id: "data.id", // { key: "data.id", default: "unknown" }
            quantity: "data.quantity", // or { key: "nested.0.quantity", default: 1 }
          }
          value: 'revenue', // Key to use for value
        },
      },
    },
  },
};
```

### Node usage

```sh
npm i --save @elbwalker/destination-web-meta-pixel
```

```ts
import { elb } from '@elbwalker/walker.js';
import destinationMetaPixel from '@elbwalker/destination-web-meta-pixel';

elb('walker destination', destinationMetaPixel, config);
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
      'https://cdn.jsdelivr.net/npm/@elbwalker/destination-web-meta-pixel/dist/index.mjs'
    )
  ).default;

  elb('walker destination', destination, config);
</script>
```

## Contribute

Feel free to contribute by submitting an [issue](https://github.com/elbwalker/walker.js/issues), starting a [discussion](https://github.com/elbwalker/walker.js/discussions) or getting in [contact](https://calendly.com/elb-alexander/30min).
