<p align="left">
  <a href="https://elbwalker.com">
    <img title="elbwalker" src='https://www.elbwalker.com/img/elbwalker_logo.png' width="256px"/>
  </a>
</p>

# Plausible Destination for walkerOS

This package provides a Plausible destination for walkerOS. It allows you to
send events to Plausible Analytics.

[View documentation](https://www.elbwalker.com/docs/destinations/web/plausible/)

## Installation

```sh
npm install @walkerOS/web-destination-plausible
```

## Usage

Here's a basic example of how to use the Plausible destination:

```typescript
import { elb } from '@walkerOS/web-collector';
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
