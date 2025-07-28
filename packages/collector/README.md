<p align="left">
  <a href="https://elbwalker.com">
    <img title="elbwalker" src='https://www.elbwalker.com/img/elbwalker_logo.png' width="256px"/>
  </a>
</p>

# Collector for walkerOS

The walkerOS Collector is the central event processing engine that unifies data
collection across web and server environments. It acts as the orchestrator
between sources (where events originate) and destinations (where events are
sent), providing consistent event processing, consent management, and data
validation across your entire data collection infrastructure.

## Role in walkerOS Ecosystem

walkerOS follows a **source → collector → destination** architecture:

- **Sources**: Capture events from various environments (browser DOM, dataLayer,
  server requests)
- **Collector**: Processes, validates, and routes events with consent awareness
- **Destinations**: Send processed events to analytics platforms (GA4, Meta,
  custom APIs)

The Collector serves as the foundation that both web and server sources depend
on, ensuring consistent event handling regardless of the environment.

## Installation

```sh
npm install @walkerOS/collector
```

## Usage

The collector provides a factory function for creating collector instances:

```typescript
import { createCollector } from '@walkerOS/collector';

// Basic setup
const { collector, elb } = await createCollector({
  consent: { functional: true },
  destinations: [
    // Add your destinations here
  ],
});

// Process events - use elb as the standard API
await elb('page view', {
  page: '/home',
});
```

## Event Naming Convention

walkerOS enforces a **"entity action"** naming convention for all events. It
makes it easier to standardize enhancements and validations. It follows a clear
separation. The mapping translates walkerOS events into platform-specific ones.

✅ **Correct**: Use spaces to separate entity and action

```typescript
await elb('order complete', { value: 99.99 });
await elb('product add', { id: 'abc123' });
await elb('page view', { path: '/home' });
```

❌ **Incorrect**: Do not use platform-specific formats

```typescript
// Don't use these in walkerOS
await elb('purchase'); // GA4 format - wrong here
await elb('order_complete', data); // Wrong: underscores
```

The collector will validate event names and destinations handle
platform-specific transformations. If the event name isn't separated into entity
action by space the collector won't process it.

## Core Features

- **Event Processing**: Validates and enriches events with context and metadata
- **Consent Management**: Respects user consent preferences across all
  destinations
- **Destination Routing**: Translates and routes events to configured
  destinations
- **State Management**: Maintains consistent state across the collection
  pipeline

## Contribute

Feel free to contribute by submitting an
[issue](https://github.com/elbwalker/walkerOS/issues), starting a
[discussion](https://github.com/elbwalker/walkerOS/discussions), or getting in
[contact](https://calendly.com/elb-alexander/30min).

## License

This project is licensed under the MIT License.
