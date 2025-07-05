<p align="left">
  <a href="https://elbwalker.com">
    <img title="elbwalker" src='https://www.elbwalker.com/img/elbwalker_logo.png' width="256px"/>
  </a>
</p>

# Google Analytics 4 (GA4) Destination for walkerOS

This package provides a Google Analytics 4 (GA4) destination for walkerOS. It
allows you to send events to GA4.

## Installation

```sh
npm install @walkerOS/web-destination-ga4
```

## Usage

Here's a basic example of how to use the GA4 destination:

```typescript
import { elb } from '@walkerOS/web-collector';
import { destinationGA4 } from '@walkerOS/web-destination-ga4';

elb('walker destination', destinationGA4, {
  custom: {
    measurementId: 'G-XXXXXXXXXX',
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
