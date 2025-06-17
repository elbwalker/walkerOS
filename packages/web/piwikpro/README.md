# Piwik PRO web destination for walkerOS

Made to be used with
[walker.js](https://www.npmjs.com/package/@elbwalker/walker.js) from
[walkerOS](https://github.com/elbwalker/walkerOS).

More detailed information and examples can be found in the
[documentation](https://www.elbwalker.com/docs/destinations/piwikpro).

## 🤓 Usage

Start by setting up the config for the destination. Optional fields as comments.
Destinations can be used via node or directly in the browser.

## Configuration

Learn more about the
[destinations](https://www.elbwalker.com/docs/destinations/) in general and read
the detailed
[Piwik PRO configuration](https://www.elbwalker.com/docs/destinations/piwikpro#configuration).

```js
const config = {
  custom: {
    appId: 'XXX-XXX-XXX-XXX-XXX', // Id of the site
    // linkTracking: false, // Disable download and outlink tracking
    // pageview: false, // Disable default pageview events
    url: 'https://your_account_name.piwik.pro/', // Same address as the login
  },
  mapping: {
    entity: {
      action: {
        custom: {
          // CustomEvent
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

### Node usage

```sh
npm i --save @elbwalker/destination-web-piwikpro
```

```ts
import { elb } from '@elbwalker/walker.js';
import destinationPiwikPro from '@elbwalker/destination-web-piwikpro';

elb('walker destination', destinationPiwikPro, config);
```

## Contribute

Feel free to contribute by submitting an
[issue](https://github.com/elbwalker/walkerOS/issues), starting a
[discussion](https://github.com/elbwalker/walkerOS/discussions) or getting in
[contact](https://calendly.com/elb-alexander/30min).
