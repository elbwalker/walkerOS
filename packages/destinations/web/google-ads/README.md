# Google Ads web destination for walkerOS

Made to be used with
[walker.js](https://www.npmjs.com/package/@elbwalker/walker.js) from
[walkerOS](https://github.com/elbwalker/walkerOS).

More detailed information and examples can be found in the
[documentation](https://www.elbwalker.com/docs/destinations/google-ads).

## 🤓 Usage

Start by setting up the config for the destination. Optional fields as comments.
Destinations can be used via node or directly in the browser.

## Configuration

Learn more about the
[destinations](https://www.elbwalker.com/docs/destinations/) in general and read
the detailled
[Google Ads configuration](https://www.elbwalker.com/docs/destinations/google-ads#configuration).

```js
const config = {
  custom: {
    conversionId: 'AW-123456789',
    currency: 'EUR',
    defaultValue: 1,
  },
  mapping: {
    // e.g. order
    entity: {
      // e.g. complete
      action: {
        custom: {
          label: 'abc',
          id: 'order_id',
          value: 'revenue',
        },
      },
    },
  },
};
```

### Node usage

```sh
npm i --save @elbwalker/destination-web-google-ads
```

```ts
import { elb } from '@elbwalker/walker.js';
import destinationGoogleAds from '@elbwalker/destination-web-google-ads';

elb('walker destination', destinationGoogleAds, config);
```

## Contribute

Feel free to contribute by submitting an
[issue](https://github.com/elbwalker/walkerOS/issues), starting a
[discussion](https://github.com/elbwalker/walkerOS/discussions) or getting in
[contact](https://calendly.com/elb-alexander/30min).
