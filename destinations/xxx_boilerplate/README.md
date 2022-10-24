> Boilerplate to create a new walker.js destination. Replace the `XXX` and `xxx` in all files with the destinations name.

# XXX web destination for walker.js

Made to be used with [@elbwalker/walker.js](https://github.com/elbwalker/walker.js).

More detailed information and examples can be found in the [documentation](https://docs.elbwalker.com/).

## 🤓 Usage

Start by installing the destination with npm:

```sh
npm i --save @elbwalker/destination-web-xxx
```

Import, configure and add the destination

```ts
import { elb } from '@elbwalker/walker.js';
import destinationXXX, {
  DestinationXXX, // Types
} from '@elbwalker/destination-web-xxx';

const configXXX: DestinationXXX.Config = {
  // consent: { marketing: true }, // Neccessary consent states
  // custom: {
  //   xxx
  // },
  // init: false, // Status if the destination was initialized successfully or should be skipped
  // loadScript: true, // Load additional required scripts on init
  // mapping: {
  //   '*': { '*': {} }, // Process all events
  // },
};

// And add the destination to the walker.js
destinationXXX.config = configXXX;
elb('walker destination', destinationXXX);
```

## Contribute

Feel free to contribute by submitting an [issue](https://github.com/elbwalker/walker.js/issues), starting a [discussion](https://github.com/elbwalker/walker.js/discussions) or getting in [contact](https://calendly.com/elb-alexander/30min).
