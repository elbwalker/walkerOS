# API web destination for walker.js

Made to be used with [@elbwalker/walker.js](https://github.com/elbwalker/walker.js).

More detailed information and examples can be found in the [documentation](https://docs.elbwalker.com/).

## 🤓 Usage

Using the destination with npm:

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
  custom: {
    url: 'https://httpbin.org/anything', // Required
    // transport: 'fetch' // Optional, default fetch, xhr as alternative
  },
  // init: false, // Status if the destination was initialized successfully or should be skipped
  // mapping: {
  //   '*': { '*': {} }, // Process all events
  // },
};

// And add the destination to the walker.js
elb('walker destination', destinationAPI, configAPI);
```

Using the destination via web import in the browser:

```html
<script type="module">
  // Upload the dist/browser.js on your own server
  import destination from 'https://cdn.jsdelivr.net/npm/@elbwalker/destination-web-api/dist/browser.js';

  elb('walker destination', destination, {
    custom: { url: 'https://httpbin.org/anything' },
  });
</script>
```

## Contribute

Feel free to contribute by submitting an [issue](https://github.com/elbwalker/walker.js/issues), starting a [discussion](https://github.com/elbwalker/walker.js/discussions) or getting in [contact](https://calendly.com/elb-alexander/30min).
