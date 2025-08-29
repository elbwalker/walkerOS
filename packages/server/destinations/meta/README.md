<p align="left">
  <a href="https://elbwalker.com">
    <img title="elbwalker" src='https://www.elbwalker.com/img/elbwalker_logo.png' width="256px"/>
  </a>
</p>

# Meta (CAPI) Destination for walkerOS

This package provides a Meta Conversion API (CAPI) destination for walkerOS. It
allows you to send events to the Meta Conversions API.

[View documentation](https://www.elbwalker.com/docs/destinations/server/meta/)

## Role in walkerOS Ecosystem

walkerOS follows a **source → collector → destination** architecture:

- **Sources**: Capture events from various environments (browser DOM, dataLayer,
  server requests)
- **Collector**: Processes, validates, and routes events with consent awareness
- **Destinations**: Send processed events to analytics platforms (GA4, Meta,
  custom APIs)

This Meta CAPI destination receives processed events from the walkerOS collector
and sends them server-to-server to Meta's Conversions API, providing enhanced
data accuracy and attribution for Meta advertising campaigns while bypassing
browser limitations.

## Installation

```sh
npm install @walkeros/server-destination-meta
```

## Usage

Here's a basic example of how to use the Meta CAPI destination:

```typescript
import { elb } from '@walkeros/collector';
import { destinationMeta } from '@walkeros/server-destination-meta';

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
