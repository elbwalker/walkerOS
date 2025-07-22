<p align="left">
  <a href="https://elbwalker.com">
    <img title="elbwalker" src='https://www.elbwalker.com/img/elbwalker_logo.png' width="256px"/>
  </a>
</p>

# Piwik PRO Destination for walkerOS

This package provides a Piwik PRO destination for walkerOS. It allows you to
send events to Piwik PRO.

[View documentation](https://www.elbwalker.com/docs/destinations/web/piwikpro/)

## Role in walkerOS Ecosystem

walkerOS follows a **source → collector → destination** architecture:

- **Sources**: Capture events from various environments (browser DOM, dataLayer,
  server requests)
- **Collector**: Processes, validates, and routes events with consent awareness
- **Destinations**: Send processed events to analytics platforms (GA4, Meta,
  custom APIs)

This Piwik PRO destination receives processed events from the walkerOS collector
and transforms them into Piwik PRO's analytics format, providing
privacy-compliant analytics with GDPR compliance and data ownership control.

## Installation

```sh
npm install @walkerOS/web-destination-piwikpro
```

## Usage

Here's a basic example of how to use the Piwik PRO destination:

```typescript
import { elb } from '@walkerOS/collector';
import { destinationPiwikPro } from '@walkerOS/web-destination-piwikpro';

elb('walker destination', destinationPiwikPro, {
  custom: {
    appId: 'YOUR_APP_ID',
    url: 'https://your-account.piwik.pro/',
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
