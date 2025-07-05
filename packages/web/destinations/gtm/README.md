<p align="left">
  <a href="https://elbwalker.com">
    <img title="elbwalker" src='https://www.elbwalker.com/img/elbwalker_logo.png' width="256px"/>
  </a>
</p>

# Google Tag Manager (GTM) Destination for walkerOS

This package provides a Google Tag Manager (GTM) destination for walkerOS. It
allows you to send events to GTM.

## Installation

```sh
npm install @walkerOS/web-destination-gtm
```

## Usage

Here's a basic example of how to use the GTM destination:

```typescript
import { elb } from '@walkerOS/web-collector';
import { destinationGTM } from '@walkerOS/web-destination-gtm';

elb('walker destination', destinationGTM, {
  custom: {
    containerId: 'GTM-XXXXXXX',
  },
});
```

## Contribute

Feel free to contribute by submitting an
[issue](https://github.com/elbwalker/walkerOS/issues), starting a
[discussion](https://github.com/elbwalker/walkerOS/discussions), or getting in
[contact](https://calendly.com/elb-alexander/30min).

## License

This project is licensed under the MIT License.
