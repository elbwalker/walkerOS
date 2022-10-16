# Event Pipe web destination for walker.js

Made to be used with [@elbwalker/walker.js](https://github.com/elbwalker/walker.js).

More detailed information and examples can be found in the [documentation](https://docs.elbwalker.com/).

## Installation

Start by installing the destination with npm:

```sh
npm i --save @elbwalker/destination-web-event-pipe
```

Import, configure and add the destination

```ts
import { DestinationEventPipe } from '@elbwalker/destination-web-event-pipe';

const config: DestinationEventPipe.Config = {
  // consent: { functional: true }, // Neccessary consent states
  custom: {
    projectId: 'W3BP4G3', // Required
    // api: 'https://moin.p.elbwalkerapis.com/lama', // Endpoint for event ingestion
    // exclusionParameters: [], // Parameters that should be redacted if available
  },
  // init: false, // Status if destination was initialized successfully or should be skipped
  // mapping: { '*': { '*': {} } }, // Process all events
};

DestinationEventPipe.config = config;

// And add the destination to the walker.js
elbwalker.push('walker destination', DestinationEventPipe); // elbwalker as instance of Elbwalker
```

## Contribute

Feel free to contribute by submitting an [issue](https://github.com/elbwalker/walker.js/issues), starting a [discussion](https://github.com/elbwalker/walker.js/discussions) or getting in [contact](https://calendly.com/elb-alexander/30min).
