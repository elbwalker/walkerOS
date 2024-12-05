# Meta Pixel (former Facebook Pixel) web destination for walkerOS

Made to be used with
[walker.js](https://www.npmjs.com/package/@elbwalker/walker.js) from
[walkerOS](https://github.com/elbwalker/walkerOS).

More detailed information and examples can be found in the
[documentation](https://www.elbwalker.com/docs/destinations/meta-pixel).

## 🤓 Usage

Start by setting up the config for the destination. Optional fields as comments.
Destinations can be used via node or directly in the browser.

## Configuration

Learn more about the
[destinations](https://www.elbwalker.com/docs/destinations/) in general and read
the detailed
[Meta Pixel configuration](https://www.elbwalker.com/docs/destinations/meta-pixel#configuration).

```js
const config = {
  custom: {
    pixelId: '1234567890',
  },
  mapping: {
    // e.g. order
    entity: {
      // e.g. complete
      action: {
        custom: {
          id: 'data.id',
          name: 'data.title',
          track: 'Purchase',
          value: 'data.revenue',
        },
      },
    },
  },
};
```

### Node usage

```sh
npm i --save @elbwalker/destination-web-meta-pixel
```

```ts
import { elb } from '@elbwalker/walker.js';
import destinationMetaPixel from '@elbwalker/destination-web-meta-pixel';

elb('walker destination', destinationMetaPixel, config);
```

## Contribute

Feel free to contribute by submitting an
[issue](https://github.com/elbwalker/walkerOS/issues), starting a
[discussion](https://github.com/elbwalker/walkerOS/discussions) or getting in
[contact](https://calendly.com/elb-alexander/30min).
