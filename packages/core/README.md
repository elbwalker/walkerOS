<p align="left">
  <a href="https://elbwalker.com">
    <img title="elbwalker" src='https://www.elbwalker.com/img/elbwalker_logo.png' width="256px"/>
  </a>
</p>

# Core Types & Utilities for walkerOS

The walkerOS Core package provides the foundational TypeScript definitions and
platform-agnostic utilities that power the entire walkerOS ecosystem. It serves
as the bedrock for type safety and shared functionality across all sources,
collectors, and destinations.

## Role in walkerOS Ecosystem

walkerOS follows a **source → collector → destination** architecture:

- **Sources**: Capture events from various environments (browser DOM, dataLayer,
  server requests)
- **Collector**: Processes, validates, and routes events with consent awareness
- **Destinations**: Send processed events to analytics platforms (GA4, Meta,
  custom APIs)

The Core package provides the essential building blocks that all other packages
depend on, ensuring consistent data structures, type definitions, and utility
functions across the entire platform.

## Installation

```sh
npm install @walkeros/core
```

## Usage

The core package exports essential types and utilities:

```typescript
import {
  // Core event types
  WalkerOS,

  // Utility functions
  assign,
  clone,
  validateEvent,

  // Consent management
  Consent,

  // Mapping utilities
  byPath,
  mapping,
} from '@walkeros/core';

// Example: Validate an event
const event: WalkerOS.Event = {
  event: 'order complete',
  data: { value: 9001 },
  // ... other properties
};

if (validateEvent(event)) {
  console.log('Event is valid!');
}
```

## Event Naming Convention

walkerOS follows a strict **"entity action"** naming convention for events:

✅ **Correct**: Use spaces to separate entity and action

```typescript
elb('order complete', { value: 99.99 });
elb('product add', { id: 'abc123' });
elb('page view', { path: '/home' });
elb('user register', { email: 'user@example.com' });
```

❌ **Incorrect**: Do not use underscores or other separators

```typescript
// Don't do this
elb('order_complete', data); // Wrong: underscores
elb('orderComplete', data); // Wrong: camelCase
elb('purchase', data); // Wrong: single word
```

**Why spaces matter**: walkerOS destinations automatically transform your
semantic event names into platform-specific formats. For example,
`'order complete'` becomes `'purchase'` for Google Analytics 4, while preserving
the original meaning in your data model.

## Core Features

- **TypeScript Definitions**: Complete type system for walkerOS events and
  configurations
- **Platform-Agnostic Utilities**: Shared functions for data manipulation and
  validation
- **Consent Types**: Standardized consent management interfaces
- **Event Validation**: Built-in validation for event structure and data
  integrity
- **Mapping Utilities**: Tools for transforming data between different formats
- **Privacy Utilities**: Functions for data anonymization and privacy compliance

## Contribute

Feel free to contribute by submitting an
[issue](https://github.com/elbwalker/walkerOS/issues), starting a
[discussion](https://github.com/elbwalker/walkerOS/discussions), or getting in
[contact](https://calendly.com/elb-alexander/30min).

## License

This project is licensed under the MIT License.
