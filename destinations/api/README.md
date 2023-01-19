# API web destination for walker.js

Made to be used with [@elbwalker/walker.js](https://github.com/elbwalker/walker.js).

More detailed information and examples can be found in the [documentation](https://docs.elbwalker.com/).

## 🤓 Usage

Start by installing the destination with npm:

```sh
npm i --save @elbwalker/destination-web-api
```

Import, configure and add the destination

```ts
import { elb } from '@elbwalker/walker.js';
import destinationAPI, {
  DestinationAPI, // Types
} from '@elbwalker/destination-web-api';

const configAPI: DestinationAPI.Config = {
  // consent: { marketing: true }, // Neccessary consent states
  // custom: {
  //   XXX
  // },
  // init: false, // Status if the destination was initialized successfully or should be skipped
  // loadScript: true, // Load additional required scripts on init
  // mapping: {
  //   '*': { '*': {} }, // Process all events
  // },
};

// And add the destination to the walker.js
destinationAPI.config = configAPI;
elb('walker destination', destinationAPI);
```

## Contribute

Feel free to contribute by submitting an [issue](https://github.com/elbwalker/walker.js/issues), starting a [discussion](https://github.com/elbwalker/walker.js/discussions) or getting in [contact](https://calendly.com/elb-alexander/30min).
