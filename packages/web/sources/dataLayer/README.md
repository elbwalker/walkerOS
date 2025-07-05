<p align="left">
  <a href="https://elbwalker.com">
    <img title="elbwalker" src='https://www.elbwalker.com/img/elbwalker_logo.png' width="256px"/>
  </a>
</p>

# DataLayer Source for walkerOS

This package provides a dataLayer source for walkerOS. It allows you to process
events from a dataLayer and send them to the walkerOS collector.

## Installation

```sh
npm install @walkerOS/web-source-dataLayer
```

## Usage

Here's a basic example of how to use the dataLayer source:

```typescript
import { elb } from '@walkerOS/web-collector';
import { sourceDataLayer } from '@walkerOS/web-source-dataLayer';

sourceDataLayer({ elb });
```

## Contribute

Feel free to contribute by submitting an
[issue](https://github.com/elbwalker/walkerOS/issues), starting a
[discussion](https://github.com/elbwalker/walkerOS/discussions), or getting in
[contact](https://calendly.com/elb-alexander/30min).

## License

This project is licensed under the MIT License.
