<p align="left">
  <a href="https://elbwalker.com">
    <img title="elbwalker" src='https://www.elbwalker.com/img/elbwalker_logo.png' width="256px"/>
  </a>
</p>

# DataLayer Source for walkerOS

This package provides a dataLayer source for walkerOS. It allows you to process
events from a dataLayer and send them to the walkerOS collector.

[View documentation](https://www.elbwalker.com/docs/sources/datalayer/)

## Role in walkerOS Ecosystem

walkerOS follows a **source → collector → destination** architecture:

- **Sources**: Capture events from various environments (browser DOM, dataLayer,
  server requests)
- **Collector**: Processes, validates, and routes events with consent awareness
- **Destinations**: Send processed events to analytics platforms (GA4, Meta,
  custom APIs)

This dataLayer source monitors the browser's dataLayer (commonly used with
Google Tag Manager) and transforms existing gtag() calls and dataLayer.push()
events into standardized walkerOS events, enabling seamless migration from
traditional dataLayer implementations.

## Installation

```sh
npm install @walkeros/web-source-dataLayer
```

## Usage

Here's a basic example of how to use the dataLayer source:

```typescript
import { elb } from '@walkeros/collector';
import { sourceDataLayer } from '@walkeros/web-source-dataLayer';

sourceDataLayer({ elb });
```

## Contribute

Feel free to contribute by submitting an
[issue](https://github.com/elbwalker/walkerOS/issues), starting a
[discussion](https://github.com/elbwalker/walkerOS/discussions), or getting in
[contact](https://calendly.com/elb-alexander/30min).

## License

This project is licensed under the MIT License.
