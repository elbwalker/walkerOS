---
title: Plausible Analytics
---

##### How to send events to Plausible Analytics via walker.js

| Destination                                                | Source Code                                                                                                                                                 |
|------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------|
| [Plausible Analytics)](https://docs.elbwalker.com/destinations/details/plausible-analytics) | [Source Code](https://github.com/elbwalker/walker.js/tree/main/destinations/plausible), [NPM](hhttps://www.npmjs.com/package/@elbwalker/destination-web-plausible) |

## What is Plausible Analytics?

[Plausible Analytics](https://plausible.io/) is a simple, and privacy-friendly Google Analytics Alternative.

## Configuration

Start by setting up the config for the destination. Optional fields as comments. Destinations can be used via node or directly in the browser.

```js
import { DestinationPlausible } from '@elbwalker/destination-web-plausible';

const config: DestinationPlausible.Config = {
  // consent: { marketing: true }, // Neccessary consent states
  // custom: {
  //   domain: 'elbwalker.com'; // Name of the domain to be tracked
  // },
  // init: true, // Skip the initialisation
  // loadScript: true, // Load additional required scripts on init
  // mapping: {
  //   '*': { '*': {} }, // Process all events
  //   page: { view: { name: 'pageview' } }, // Set up pageview event
  // },
};
```

### Node usage

```js
npm i --save @elbwalker/destination-web-plausible
```

```js
import { elb } from '@elbwalker/walker.js';
import destinationPlausible from '@elbwalker/destination-web-plausible';

elb('walker destination', destinationPlausible, config);
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
      'https://cdn.jsdelivr.net/npm/@elbwalker/destination-web-plausible/dist/index.mjs'
    )
  ).default;

  elb('walker destination', destination, config);
</script>
```