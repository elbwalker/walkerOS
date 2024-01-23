# Piwik PRO web destination for walkerOS

Made to be used with
[@elbwalker/walkerOS](https://github.com/elbwalker/walkerOS).

More detailed information and examples can be found in the
[documentation](https://docs.elbwalker.com/).

## 🤓 Usage

Start by setting up the config for the destination. Optional fields as comments.
Destinations can be used via node or directly in the browser.

## Configuration

```ts
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

> Note: Both `setSiteId` and `setTrackerUrl` are only set with
> `loadScript = true`.

### Node usage

```sh
npm i --save @elbwalker/destination-web-piwikpro
```

```ts
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

## Debugging

Learn how to
[check your tracking](https://help.piwik.pro/support/collecting-data/tracker-debugger/#check-your-tracking)

```js
_paq.push([
  function () {
    console.log(this.getVisitorId());
  },
]);
```

## Contribute

Feel free to contribute by submitting an
[issue](https://github.com/elbwalker/walkerOS/issues), starting a
[discussion](https://github.com/elbwalker/walkerOS/discussions) or getting in
[contact](https://calendly.com/elb-alexander/30min).
