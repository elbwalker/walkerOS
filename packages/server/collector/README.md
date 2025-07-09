<p align="left">
  <a href="https://elbwalker.com">
    <img title="elbwalker" src='https://www.elbwalker.com/img/elbwalker_logo.png' width="256px"/>
  </a>
</p>

# Server Collector for walkerOS

This package provides a server-side event collection for walkerOS. It's designed
to be used in Node.js environments to collect and process events before sending
them to their destinations.

[View documentation](https://www.elbwalker.com/docs/collectors/server/)

## Installation

```sh
npm install @walkerOS/server-collector
```

## Usage

Here's a basic example of how to use the server collector:

```typescript
import { createServerCollector } from '@walkerOS/server-collector';

// Create a new server collector collector
const { elb, collector } = createServerCollector({
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
