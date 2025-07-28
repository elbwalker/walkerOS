<p align="left">
  <a href="https://elbwalker.com">
    <img title="elbwalker" src='https://www.elbwalker.com/img/elbwalker_logo.png' width="256px"/>
  </a>
</p>

# Google Cloud Platform (GCP) Destination for walkerOS

This package provides a Google Cloud Platform (GCP) destination for walkerOS. It
allows you to send events to Google BigQuery.

[View documentation](https://www.elbwalker.com/docs/destinations/server/gcp/)

## Role in walkerOS Ecosystem

walkerOS follows a **source → collector → destination** architecture:

- **Sources**: Capture events from various environments (browser DOM, dataLayer,
  server requests)
- **Collector**: Processes, validates, and routes events with consent awareness
- **Destinations**: Send processed events to analytics platforms (GA4, Meta,
  custom APIs)

This GCP destination receives processed events from the walkerOS collector and
streams them to Google BigQuery, enabling real-time data warehousing and
analytics with Google Cloud's powerful data processing and machine learning
capabilities.

## Installation

```sh
npm install @walkeros/server-destination-gcp
```

## Usage

Here's a basic example of how to use the GCP destination:

```typescript
import { elb } from '@walkeros/collector';
import { destinationBigQuery } from '@walkeros/server-destination-gcp';

elb('walker destination', destinationBigQuery, {
  custom: {
    projectId: 'YOUR_PROJECT_ID',
    datasetId: 'YOUR_DATASET_ID',
    tableId: 'YOUR_TABLE_ID',
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
