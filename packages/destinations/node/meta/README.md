<p align="left">
  <a href="https://elbwalker.com">
    <img title="elbwalker" src='https://www.elbwalker.com/img/elbwalker_logo.png' width="256px"/>
  </a>
</p>

# Meta Conversion API (CAPI) destination for walkerOS

Made to be used with
[source node](https://www.npmjs.com/package/@elbwalker/source-node) from
[walkerOS](https://github.com/elbwalker/walkerOS).

More detailed information and examples can be found in the
[documentation](https://www.elbwalker.com/docs/destinations/meta).

## 🤓 Usage

Start by setting up the config for the destination. Optional fields as comments.
Destinations can be used via node or directly in the browser.

## Configuration

Learn more about the
[destinations](https://www.elbwalker.com/docs/destinations/) in general and read
the detailed
[Meta Conversion API](https://developers.facebook.com/docs/marketing-api/conversions-api).

```js
import type { Custom } from '@elbwalker/destination-node-meta';

const config: Custom = {
  custom: {
    accessToken: 's3cr3tc0d3',
    pixelId: '1234567890',
    // debug: true,
    // partner: 'walkerOS',
    // testCode: 'TEST00000',
  },
  mapping: {
    // e.g. order
    entity: {
      // e.g. complete
      action: {
        name: 'Purchase',
        custom: {
          id: 'data.id',
          name: 'data.title',
          value: 'data.total',
        },
      },
    },
  },
};
```

### Node usage

```sh
npm i --save @elbwalker/destination-node-meta
```

```ts
import destinationMeta from '@elbwalker/destination-node-meta';

elb('walker destination', destinationMeta, config);
```

Mapping Mock

For easier debugging add

```js
if (response.error) console.log('🚀 ~ response:', response);
```

to the `node_modules/facebook-nodejs-business-sdk/dist/cjs` on line 261 within
the `xmlHttpRequest`.

## Contribute

Feel free to contribute by submitting an
[issue](https://github.com/elbwalker/walkerOS/issues), starting a
[discussion](https://github.com/elbwalker/walkerOS/discussions) or getting in
[contact](https://calendly.com/elb-alexander/30min).
