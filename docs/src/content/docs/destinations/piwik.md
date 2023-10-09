---
title: Piwik PRO
---

##### How to send events to Piwik PRO via walker.js

| Destination                                                | Source Code                                                                                                                                                 |
|------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------|
| [Piwik PRO)](https://docs.elbwalker.com/destinations/details/piwik-pro) | [Source Code](https://github.com/elbwalker/walker.js/tree/main/destinations/piwik-pro), [NPM](https://www.npmjs.com/package/@elbwalker/destination-web-piwikpro) |

## What is Piwik PRO?

[Piwik PRO](https://piwik.pro/) is a web analytics and marketing platform that helps businesses track website traffic, user behavior, and conversion rates. It offers advanced analytics features, audience segmentation, and targeted marketing tools. Piwik PRO prioritizes data privacy and security, complying with GDPR and other data protection regulations. Businesses can use Piwik PRO to improve their website's user experience and drive conversions while keeping customer data safe.

## Configuration

Start by setting up the config for the destination. Optional fields as comments. Destinations can be used via node or directly in the browser.

```js
import { DestinationPiwikPro } from '@elbwalker/destination-web-piwikpro';

const config /* : DestinationPiwikPro.Config */ = {
  // consent: { marketing: true }, // Neccessary consent states
  custom: {
    appId: 'XXX-XXX-XXX-XXX-XXX', // Id of the site
    // linkTracking: false, // Disable download and outlink tracking
    // pageview: false, // Disable default pageview events
    url: 'https://your_account_name.piwik.pro/', // Same address as the login
  },
  // init: true, // Skip the initialisation
  // loadScript: true, // Load additional required scripts on init
  mapping: {
    '*': {
      '*': {
        custom: {
          // CustomEventConfig
          goalId: 'xxx-xxx-...', // Count the event as a goal
          goalValue: '', // Property to be used as goal value
          name: '', // Renaming the event
          value: '', // Property to be used for the value
        },
      },
    },
  },
};
```

Use the `string-dot` notation (`data.id`, `user.id`, `group`, `context.position.0`) to access all values of an event.

### Node usage

```js
npm i --save @elbwalker/destination-web-piwikpro
```

```js
import { elb } from '@elbwalker/walker.js';
import destinationPiwikPro from '@elbwalker/destination-web-piwikpro';

elb('walker destination', destinationPiwikPro, config);
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
      'https://cdn.jsdelivr.net/npm/@elbwalker/destination-web-piwikpro/dist/index.mjs'
    )
  ).default;

  elb('walker destination', destination, config);
</script>
```
