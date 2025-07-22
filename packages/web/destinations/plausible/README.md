<p align="left">
  <a href="https://elbwalker.com">
    <img title="elbwalker" src='https://www.elbwalker.com/img/elbwalker_logo.png' width="256px"/>
  </a>
</p>

# Plausible Destination for walkerOS

This package provides a Plausible destination for walkerOS. It allows you to
send events to Plausible Analytics.

[View documentation](https://www.elbwalker.com/docs/destinations/web/plausible/)

## Role in walkerOS Ecosystem

walkerOS follows a **source → collector → destination** architecture:

- **Sources**: Capture events from various environments (browser DOM, dataLayer,
  server requests)
- **Collector**: Processes, validates, and routes events with consent awareness
- **Destinations**: Send processed events to analytics platforms (GA4, Meta,
  custom APIs)

This Plausible destination receives processed events from the walkerOS collector
and transforms them into Plausible Analytics format, providing lightweight,
privacy-focused web analytics without cookies or personal data collection.

## Installation

```sh
npm install @walkerOS/web-destination-plausible
```

## Usage

Here's a basic example of how to use the Plausible destination:

```typescript
import { elb } from '@walkerOS/collector';
import { destinationPlausible } from '@walkerOS/web-destination-plausible';

elb('walker destination', destinationPlausible, {
  custom: {
    domain: 'your-domain.com',
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
