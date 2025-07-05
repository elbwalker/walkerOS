<p align="left">
  <a href="https://elbwalker.com">
    <img title="elbwalker" src='https://www.elbwalker.com/img/elbwalker_logo.png' width="256px"/>
  </a>
</p>

# Meta Pixel Destination for walkerOS

This package provides a Meta Pixel (formerly Facebook Pixel) destination for
walkerOS. It allows you to send events to Meta Pixel.

[View documentation](https://www.elbwalker.com/docs/destinations/web/meta/)

## Installation

```sh
npm install @walkerOS/web-destination-meta
```

## Usage

Here's a basic example of how to use the Meta Pixel destination:

```typescript
import { elb } from '@walkerOS/web-collector';
import { destinationMetaPixel } from '@walkerOS/web-destination-meta';

elb('walker destination', destinationMetaPixel, {
  custom: {
    pixelId: '1234567890',
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
