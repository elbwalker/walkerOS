---
title: API
---

##### How to send events to a custom API endpoint via walker.js

| Destination                                                | Source Code                                                                                                                                                 |
|------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------|
| [API](#api) | [Source Code](https://github.com/elbwalker/walker.js/tree/main/destinations/api), [NPM](https://www.npmjs.com/package/@elbwalker/destination-web-event-pipe) |

## Configuration

Start by setting up the config for the destination. Optional fields as comments. Destinations can be used via node or directly in the browser.

```js
import { DestinationAPI } from '@elbwalker/destination-web-api';

const config /* : DestinationAPI.Config */ = {
  // consent: { marketing: true }, // Neccessary consent states
  custom: {
    url: 'https://httpbin.org/anything', // Required
    // transport: 'fetch' // fetch (default), xhr or beacon
  },
  // init: true, // Skip the initialisation
  // mapping: {
  //   '*': { '*': {} }, // Process all events
  // },
};
```

### Node usage

```js
npm i --save @elbwalker/destination-web-api
```

```js
import { elb } from '@elbwalker/walker.js';
import destinationAPI from '@elbwalker/destination-web-api';

elb('walker destination', destinationAPI, config);
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
      'https://cdn.jsdelivr.net/npm/@elbwalker/destination-web-api/dist/index.mjs'
    )
  ).default;

  elb('walker destination', destination, config);
</script>
```