<p align="left">
  <a href="https://www.walkeros.io">
    <img title="elbwalker" src="https://www.walkeros.io/img/elbwalker_logo.png" width="256px"/>
  </a>
</p>

# DataLayer Source for walkerOS

[Source Code](https://github.com/elbwalker/walkerOS/tree/main/packages/web/sources/dataLayer)
&bull;
[NPM Package](https://www.npmjs.com/package/@walkeros/web-source-datalayer)

This package provides a dataLayer source for walkerOS. It allows you to process
events from a dataLayer and send them to the walkerOS collector.

walkerOS follows a **source → collector → destination** architecture. This
dataLayer source monitors the browser's dataLayer (commonly used with Google Tag
Manager) and transforms existing gtag() calls and dataLayer.push() events into
standardized walkerOS events, enabling seamless migration from traditional
dataLayer implementations.

## Installation

```sh
npm install @walkeros/web-source-datalayer
```

## Usage

Here's a basic example of how to use the dataLayer source:

```typescript
import { elb } from '@walkeros/collector';
import { sourceDataLayer } from '@walkeros/web-source-datalayer';

sourceDataLayer({ elb });
```

## Configuration

| Name     | Type                                                   | Description                                                   | Required | Example                                         |
| -------- | ------------------------------------------------------ | ------------------------------------------------------------- | -------- | ----------------------------------------------- |
| `name`   | `string`                                               | DataLayer variable name (default: "dataLayer")                | No       | `'dataLayer'`                                   |
| `prefix` | `string`                                               | Event prefix for filtering dataLayer events (default: "gtag") | No       | `'gtag'`                                        |
| `filter` | `(event: unknown) => WalkerOS.PromiseOrValue<boolean>` | Function to filter which dataLayer events to process          | No       | `(event) => event && typeof event === "object"` |

## Contribute

Feel free to contribute by submitting an
[issue](https://github.com/elbwalker/walkerOS/issues), starting a
[discussion](https://github.com/elbwalker/walkerOS/discussions), or getting in
[contact](https://calendly.com/elb-alexander/30min).

## License

This project is licensed under the MIT License.
