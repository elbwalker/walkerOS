---
title: Google Tag Manager (GTM)
---

##### How to send events to Google Tag Manager (GTM) via walker.js

| Destination                                                | Source Code                                                                                                                                                 |
|------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------|
| [Google Tag Manager)](https://docs.elbwalker.com/destinations/details/google-tag-manager-gtm) | [Source Code](https://github.com/elbwalker/walker.js/tree/main/destinations/google-gtm), [NPM](https://www.npmjs.com/package/@elbwalker/destination-web-google-gtm) |

## What is the Google Tag Manager (GTM)?

The [Google Tag Manager (GTM)](https://marketingplatform.google.com/about/tag-manager/) is a popular tag management solution that allows you to create and update tags for your web and mobile applications.

## Configuration

Start by setting up the config for the destination. Optional fields as comments. Destinations can be used via node or directly in the browser.

```js
import { DestinationGoogleGTM } from '@elbwalker/destination-web-google-gtm';

const config /* : DestinationGoogleGTM.Config */ = {
  // consent: { functional: true }, // Neccessary consent states
  // custom: {
  //   containerId: "GTM-XXXXXXX", // The published container id
  //   dataLayer: "dataLayer", // Name of the dataLayer array
  //   domain: "https://www.googletagmanager.com/gtm.js?id="; // Source domain
  // },
  // init: true, // Skip the initialisation
  // mapping: { '*': { '*': {} } }, // Process all events
};
```

### Node usage

```js
npm i --save @elbwalker/destination-web-google-gtm
```

```js
import { elb } from '@elbwalker/walker.js';
import destinationGoogleGTM from '@elbwalker/destination-web-google-gtm';

elb('walker destination', destinationGoogleGTM, config);
```

### Browser usage

```html
<script>
  // Make sure to initialize the elb function once.
  function elb() {
    (window.elbLayer = window.elbLayer || []).push(arguments);
  }

  // Upload the dist/index.mjs on your own server
  const destination = (
    await import(
      'https://cdn.jsdelivr.net/npm/@elbwalker/destination-web-google-gtm/dist/index.mjs'
    )
  ).default;

  elb('walker destination', destination, config);
</script>
```