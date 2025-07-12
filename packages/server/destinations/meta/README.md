<p align="left">
  <a href="https://elbwalker.com">
    <img title="elbwalker" src='https://www.elbwalker.com/img/elbwalker_logo.png' width="256px"/>
  </a>
</p>

# Meta (CAPI) Destination for walkerOS

This package provides a Meta Conversion API (CAPI) destination for walkerOS. It
allows you to send events to the Meta Conversions API.

[View documentation](https://www.elbwalker.com/docs/destinations/server/meta/)

## Installation

```sh
npm install @walkerOS/server-destination-meta
```

## Usage

Here's a basic example of how to use the Meta CAPI destination:

```typescript
import { elb } from '@walkerOS/server-collector';
import { destinationMeta } from '@walkerOS/server-destination-meta';

elb('walker destination', destinationMeta, {
  custom: {
    accessToken: 'YOUR_ACCESS_TOKEN',
    pixelId: 'YOUR_PIXEL_ID',
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
