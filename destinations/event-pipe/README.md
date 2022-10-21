# Event Pipe web destination for walker.js

Made to be used with [@elbwalker/walker.js](https://github.com/elbwalker/walker.js).

More detailed information and examples can be found in the [documentation](https://docs.elbwalker.com/).

## 🤓 Usage

Start by installing the destination with npm:

```sh
npm i --save @elbwalker/destination-web-event-pipe
```

Import, configure and add the destination

```ts
import { elb } from '@elbwalker/walker.js';
import destinationEventPipe, {
  DestinationEventPipe, // Types
} from '@elbwalker/destination-web-event-pipe';

const configEventPipe: DestinationEventPipe.Config = {
  // consent: { functional: true }, // Neccessary consent states
  custom: {
    projectId: 'W3BP4G3', // Required
    // api: 'https://moin.p.elbwalkerapis.com/lama', // Endpoint for event ingestion
    // exclusionParameters: [], // Parameters that should be redacted if available
  },
  // init: false, // Status if the destination was initialized successfully or should be skipped
  // mapping: { '*': { '*': {} } }, // Process all events
};

// And add the destination to the walker.js
destinationEventPipe.config = configEventPipe;
elb('walker destination', destinationEventPipe);
```

## Contribute

Feel free to contribute by submitting an [issue](https://github.com/elbwalker/walker.js/issues), starting a [discussion](https://github.com/elbwalker/walker.js/discussions) or getting in [contact](https://calendly.com/elb-alexander/30min).
