# Google Analytics 4 (GA4) web destination for walker.js

Made to be used with [@elbwalker/walker.js](https://github.com/elbwalker/walker.js).

More detailed information and examples can be found in the [documentation](https://docs.elbwalker.com/).

## 🤓 Usage

Start by installing the destination with npm:

```sh
npm i --save @elbwalker/destination-web-google-ga4
```

Import, configure and add the destination

```ts
import { elb } from '@elbwalker/walker.js';
import { DestinationGA4 } from '@elbwalker/destination-web-google-ga4';

const config: DestinationGA4.Config = {
  // consent: { marketing: true }, // Neccessary consent states
  custom: {
    measurementId: 'G-XXXXXX-1', // Required
    // transport_url: '', // optional: endpoint where to send data to
  },
  // init: false, // Status if the destination was initialized successfully or should be skipped
  // loadScript: true, // Load additional required scripts on init
  mapping: {
    '*': { '*': {} }, // Process all events
    // entity: { action: { name: 'custom_name' } },
    page: { view: { ignore: true } }, // Ignore page view events
  },
};

DestinationGA4.config = config;

// And add the destination to the walker.js
elb('walker destination', DestinationGA4);
```

## Contribute

Feel free to contribute by submitting an [issue](https://github.com/elbwalker/walker.js/issues), starting a [discussion](https://github.com/elbwalker/walker.js/discussions) or getting in [contact](https://calendly.com/elb-alexander/30min).
