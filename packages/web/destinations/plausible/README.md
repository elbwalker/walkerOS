# Plausible web destination for walkerOS

Made to be used with
[walker.js](https://www.npmjs.com/package/@elbwalker/walker.js) from
[walkerOS](https://github.com/elbwalker/walkerOS).

More detailed information and examples can be found in the
[documentation](https://www.elbwalker.com/docs/destinations/plausible).

## 🤓 Usage

Start by setting up the config for the destination. Optional fields as comments.
Destinations can be used via node or directly in the browser.

## Configuration

Learn more about the
[destinations](https://www.elbwalker.com/docs/destinations/) in general and read
the detailled
[Plausible Analytics configuration](https://www.elbwalker.com/docs/destinations/plausible#configuration).

```js
const config = {
  custom: {
    domain: 'elbwalker.com', // Optional, domain of your site as registered
  },
};
```

### Server usage

```sh
npm i --save @elbwalker/destination-web-plausible
```

```ts
import { elb } from '@elbwalker/walker.js';
import destinationPlausible from '@elbwalker/destination-web-plausible';

elb('walker destination', destinationPlausible, config);
```

## Contribute

Feel free to contribute by submitting an
[issue](https://github.com/elbwalker/walkerOS/issues), starting a
[discussion](https://github.com/elbwalker/walkerOS/discussions) or getting in
[contact](https://calendly.com/elb-alexander/30min).
