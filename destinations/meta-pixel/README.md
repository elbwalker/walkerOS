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
  // custom: {
  //
  // },
  // init: false, // Status if the destination was initialized successfully or should be skipped
  // loadScript: true, // Load additional required scripts on init
  // mapping: {
  //   '*': { '*': {} }, // Process all events
  // },
};

// And add the destination to the walker.js
destinationMeta.config = configMeta;
elb('walker destination', destinationMeta);
```

## Contribute

Feel free to contribute by submitting an [issue](https://github.com/elbwalker/walker.js/issues), starting a [discussion](https://github.com/elbwalker/walker.js/discussions) or getting in [contact](https://calendly.com/elb-alexander/30min).
