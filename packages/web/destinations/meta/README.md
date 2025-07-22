<p align="left">
  <a href="https://elbwalker.com">
    <img title="elbwalker" src='https://www.elbwalker.com/img/elbwalker_logo.png' width="256px"/>
  </a>
</p>

# Meta Pixel Destination for walkerOS

This package provides a Meta Pixel (formerly Facebook Pixel) destination for
walkerOS. It allows you to send events to Meta Pixel.

[View documentation](https://www.elbwalker.com/docs/destinations/web/meta/)

## Role in walkerOS Ecosystem

walkerOS follows a **source → collector → destination** architecture:

- **Sources**: Capture events from various environments (browser DOM, dataLayer,
  server requests)
- **Collector**: Processes, validates, and routes events with consent awareness
- **Destinations**: Send processed events to analytics platforms (GA4, Meta,
  custom APIs)

This Meta Pixel destination receives processed events from the walkerOS
collector and transforms them into Meta's Pixel API format, handling conversion
events, custom events, and audience building data to optimize your Meta
advertising campaigns.

## Installation

```sh
npm install @walkerOS/web-destination-meta
```

## Usage

Here's a basic example of how to use the Meta Pixel destination:

```typescript
import { elb } from '@walkerOS/collector';
import { destinationMeta } from '@walkerOS/web-destination-meta';

elb('walker destination', destinationMeta, {
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
