<p align="left">
  <a href="https://elbwalker.com">
    <img title="elbwalker" src='https://www.elbwalker.com/img/elbwalker_logo.png' width="256px"/>
  </a>
</p>

# Google Analytics 4 (GA4) Destination for walkerOS

This package provides a Google Analytics 4 (GA4) destination for walkerOS. It
allows you to send events to GA4.

[View documentation](https://www.elbwalker.com/docs/destinations/web/ga4/)

## Role in walkerOS Ecosystem

walkerOS follows a **source → collector → destination** architecture:

- **Sources**: Capture events from various environments (browser DOM, dataLayer,
  server requests)
- **Collector**: Processes, validates, and routes events with consent awareness
- **Destinations**: Send processed events to analytics platforms (GA4, Meta,
  custom APIs)

This GA4 destination receives processed events from the walkerOS collector and
automatically transforms them into Google Analytics 4 format, handling the
measurement protocol, event structure, and data mapping to ensure your walkerOS
events appear correctly in your GA4 reports.

## Installation

```sh
npm install @walkerOS/web-destination-ga4
```

## Usage

Here's a basic example of how to use the GA4 destination:

```typescript
import { elb } from '@walkerOS/collector';
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
