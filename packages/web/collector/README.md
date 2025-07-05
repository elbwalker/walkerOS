<p align="left">
  <a href="https://elbwalker.com">
    <img title="elbwalker" src='https://www.elbwalker.com/img/elbwalker_logo.png' width="256px"/>
  </a>
</p>

# Web Collector for walkerOS

This package provides a browser-based event collection for walkerOS. It's
designed to be used in web environments to collect and process events before
sending them to their destinations.

[View documentation](https://www.elbwalker.com/docs/collectors/web/)

## Installation

```sh
npm install @walkerOS/web-collector
```

## Usage

Here's a basic example of how to use the web collector:

```typescript
import { createWebCollector } from '@walkerOS/web-collector';

// Create a new web collector instance
const { elb, instance } = createWebCollector({
  // Optional configuration
});

// Push an event
elb('entity action', { key: 'value' });
```

## Contribute

Feel free to contribute by submitting an
[issue](https://github.com/elbwalker/walkerOS/issues), starting a
[discussion](https://github.com/elbwalker/walkerOS/discussions), or getting in
[contact](https://calendly.com/elb-alexander/30min).

## License

This project is licensed under the MIT License.
