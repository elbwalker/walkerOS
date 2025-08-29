<p align="left">
  <a href="https://elbwalker.com">
    <img title="elbwalker" src='https://www.elbwalker.com/img/elbwalker_logo.png' width="256px"/>
  </a>
</p>

# Web Core Utilities for walkerOS

The walkerOS Web Core package provides browser-specific utilities and functions
that power web-based data collection. It extends the platform-agnostic Core
package with web-specific functionality for DOM interaction, session management,
and browser environment detection.

## Role in walkerOS Ecosystem

walkerOS follows a **source → collector → destination** architecture:

- **Sources**: Capture events from various environments (browser DOM, dataLayer,
  server requests)
- **Collector**: Processes, validates, and routes events with consent awareness
- **Destinations**: Send processed events to analytics platforms (GA4, Meta,
  custom APIs)

The Web Core package serves as the foundation for all web-based sources and
destinations, providing essential browser utilities, session handling, and
web-specific event processing capabilities.

## Installation

```sh
npm install @walkeros/web-core
```

## Usage

The web core package provides browser-specific utilities:

```typescript
import {
  // Browser utilities
  getBrowser,
  getHash,
  isVisible,

  // Session management
  sessionStart,
  sessionStorage,

  // Web-specific event handling
  sendWeb,

  // Storage utilities
  storage,
} from '@walkeros/web-core';

// Example: Check if element is visible
const element = document.getElementById('my-element');
if (isVisible(element)) {
  console.log('Element is visible in viewport');
}

// Example: Get browser information
const browserInfo = getBrowser();
console.log('Browser:', browserInfo.name, browserInfo.version);
```

## Core Features

- **Browser Detection**: Identify browser type, version, and capabilities
- **DOM Utilities**: Functions for element visibility, attributes, and
  manipulation
- **Session Management**: Handle web session lifecycle and storage
- **Viewport Detection**: Determine element visibility and user interaction
- **Web Storage**: Unified interface for localStorage and sessionStorage
- **Hash Generation**: Create consistent identifiers for web environments
- **Event Transmission**: Web-optimized event sending mechanisms

## Contribute

Feel free to contribute by submitting an
[issue](https://github.com/elbwalker/walkerOS/issues), starting a
[discussion](https://github.com/elbwalker/walkerOS/discussions), or getting in
[contact](https://calendly.com/elb-alexander/30min).

## License

This project is licensed under the MIT License.
