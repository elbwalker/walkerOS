<p align="left">
  <a href="https://elbwalker.com">
    <img title="elbwalker" src='https://www.elbwalker.com/img/elbwalker_logo.png' width="256px"/>
  </a>
</p>

# Google Ads Destination for walkerOS

This package provides a Google Ads destination for walkerOS. It allows you to
send conversion events to Google Ads.

[View documentation](https://www.elbwalker.com/docs/destinations/web/google_ads/)

## Installation

```sh
npm install @walkerOS/web-destination-google-ads
```

## Usage

Here's a basic example of how to use the Google Ads destination:

```typescript
import { elb } from '@walkerOS/web-collector';
import { destinationAds } from '@walkerOS/web-destination-google-ads';

elb('walker destination', destinationAds, {
  custom: {
    conversionId: 'AW-123456789',
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
