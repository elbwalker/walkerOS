# Meta Pixel (former Facebook Pixel) web destination for walker.js

Made to be used with [@elbwalker/walker.js](https://github.com/elbwalker/walker.js).

More detailed information and examples can be found in the [documentation](https://docs.elbwalker.com/).

## 🤓 Usage

Start by installing the destination with npm:

```sh
npm i --save @elbwalker/destination-web-meta-pixel
```

Import, configure and add the destination

```ts
import { elb } from '@elbwalker/walker.js';
import destinationMeta, {
  DestinationMeta, // Types
} from '@elbwalker/destination-web-meta-pixel';

const configMeta: DestinationMeta.Config = {
  // consent: { marketing: true }, // Neccessary consent states
  custom: {
    pixelId: '1234567890', // The ads accounts id used for every conversion
    // currency: 'EUR', // Default currency is EUR
    // pageview: true, // Send the PageView event (default yes, deactivate actively)
  },
  // init: false, // Status if the destination was initialized successfully or should be skipped
  // loadScript: true, // Load additional required scripts on init
  mapping: {
    order: {
      complete: {
        // id: 'order_id', // Name of data property key to use in content_ids
        // name: 'title', // Name of data property key to use as content_name
        track: 'Purchase', // Name of a standard event to track
        value: 'revenue', // Name of data property key to use for value
      },
    },
  },
};
destinationMeta.config = configMeta;
elb('walker destination', destinationMeta);
```

## Contribute

Feel free to contribute by submitting an [issue](https://github.com/elbwalker/walker.js/issues), starting a [discussion](https://github.com/elbwalker/walker.js/discussions) or getting in [contact](https://calendly.com/elb-alexander/30min).
