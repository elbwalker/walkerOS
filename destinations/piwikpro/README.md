# Piwik PRO web destination for walker.js

Made to be used with [@elbwalker/walker.js](https://github.com/elbwalker/walker.js).

More detailed information and examples can be found in the [documentation](https://docs.elbwalker.com/).

## 🤓 Usage

Start by setting up the config for the destination. Optional fields as comments.
Destinations can be used via node or directly in the browser.

## Configuration

```ts
import { DestinationPiwikPro } from '@elbwalker/destination-web-piwikpro';

const config /* : DestinationPiwikPro.Config */ = {
  // consent: { marketing: true }, // Neccessary consent states
  custom: {
    // CustomConfig
  },
  // init: true, // Skip the initialisation
  // loadScript: true, // Load additional required scripts on init
  mapping: {
    '*': {
      '*': {
        custom: {
          // CustomEventConfig
        },
      },
    },
  },
};
```

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

## Contribute

Feel free to contribute by submitting an [issue](https://github.com/elbwalker/walker.js/issues), starting a [discussion](https://github.com/elbwalker/walker.js/discussions) or getting in [contact](https://calendly.com/elb-alexander/30min).
