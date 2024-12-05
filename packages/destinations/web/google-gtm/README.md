# Google Tag Manager (GTM) web destination for walkerOS

Made to be used with
[walker.js](https://www.npmjs.com/package/@elbwalker/walker.js) from
[walkerOS](https://github.com/elbwalker/walkerOS).

More detailed information and examples can be found in the
[documentation](https://www.elbwalker.com/docs/destinations/google-gtm).

## 🤓 Usage

Start by setting up the config for the destination. Optional fields as comments.
Destinations can be used via node or directly in the browser.

## Configuration

Learn more about the
[destinations](https://www.elbwalker.com/docs/destinations/) in general and read
the detailled
[Google Tag Manager configuration](https://www.elbwalker.com/docs/destinations/google-gtm#configuration).

```js
const config = {
  custom: {
    containerId: "GTM-XXXXXXX",
    dataLayer: "dataLayer",
    domain: "https://www.googletagmanager.com/gtm.js?id=";
  },
};
```

### Node usage

```sh
npm i --save @elbwalker/destination-web-google-gtm
```

```ts
import { elb } from '@elbwalker/walker.js';
import destinationGoogleGTM from '@elbwalker/destination-web-google-gtm';

elb('walker destination', destinationGoogleGTM, config);
```

## Contribute

Feel free to contribute by submitting an
[issue](https://github.com/elbwalker/walkerOS/issues), starting a
[discussion](https://github.com/elbwalker/walkerOS/discussions) or getting in
[contact](https://calendly.com/elb-alexander/30min).
