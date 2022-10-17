# Google Tag Manager (GTM) web destination for walker.js

Made to be used with [@elbwalker/walker.js](https://github.com/elbwalker/walker.js).

More detailed information and examples can be found in the [documentation](https://docs.elbwalker.com/).

## 🤓 Usage

Start by installing the destination with npm:

```sh
npm i --save @elbwalker/walker.js @elbwalker/destination-web-google-gtm
```

Import, configure and add the destination

```ts
import { elb } from '@elbwalker/walker.js';
import { DestinationGTM } from '@elbwalker/destination-web-google-gtm';

const config: DestinationGTM.Config = {
  // consent: { functional: true }, // Neccessary consent states
  // custom: {
  //   containerId: "GTM-XXXXXXX", // The published container id
  //   dataLayer: "dataLayer", // Name of the dataLayer array
  //   domain: "https://www.googletagmanager.com/gtm.js?id="; // Source domain of the GTM
  // },
  // init: false, // Status if the destination was initialized successfully or should be skipped
  // mapping: { '*': { '*': {} } }, // Process all events
};

DestinationGTM.config = config;

// And add the destination to the walker.js
elb('walker destination', DestinationGTM);
```

## Contribute

Feel free to contribute by submitting an [issue](https://github.com/elbwalker/walker.js/issues), starting a [discussion](https://github.com/elbwalker/walker.js/discussions) or getting in [contact](https://calendly.com/elb-alexander/30min).
