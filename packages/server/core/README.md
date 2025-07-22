<p align="left">
  <a href="https://elbwalker.com">
    <img title="elbwalker" src='https://www.elbwalker.com/img/elbwalker_logo.png' width="256px"/>
  </a>
</p>

# Server Core Utilities for walkerOS

The walkerOS Server Core package provides server-specific utilities and
functions that power server-side data collection. It extends the
platform-agnostic Core package with Node.js-specific functionality for server
environment detection, request handling, and server-side event processing.

## Role in walkerOS Ecosystem

walkerOS follows a **source → collector → destination** architecture:

- **Sources**: Capture events from various environments (browser DOM, dataLayer,
  server requests)
- **Collector**: Processes, validates, and routes events with consent awareness
- **Destinations**: Send processed events to analytics platforms (GA4, Meta,
  custom APIs)

The Server Core package serves as the foundation for all server-based sources
and destinations, providing essential Node.js utilities, request handling, and
server-specific event processing capabilities.

## Installation

```sh
npm install @walkerOS/server-core
```

## Usage

The server core package provides Node.js-specific utilities:

```typescript
import {
  // Server utilities
  getHashServer,
  sendServer,

  // Type definitions
  ServerDestination,
} from '@walkerOS/server-core';

// Example: Generate server-side hash
const hash = await getHashServer('user-id', 'additional-data');
console.log('Generated hash:', hash);

// Example: Send event from server
await sendServer({
  event: 'order complete',
  data: { orderId: '12345', profit: 42 },
  // ... other event properties
});
```

## Core Features

- **Server Environment Detection**: Identify Node.js version and server
  capabilities
- **Request Processing**: Handle incoming HTTP requests and extract event data
- **Server-Side Hashing**: Generate consistent identifiers in server
  environments
- **Event Transmission**: Server-optimized event sending mechanisms
- **Server Destinations**: Base classes and utilities for server-side
  destinations
- **Performance Optimization**: Memory-efficient processing for high-throughput
  scenarios

## Contribute

Feel free to contribute by submitting an
[issue](https://github.com/elbwalker/walkerOS/issues), starting a
[discussion](https://github.com/elbwalker/walkerOS/discussions), or getting in
[contact](https://calendly.com/elb-alexander/30min).

## License

This project is licensed under the MIT License.
