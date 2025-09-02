<p align="left">
  <a href="https://elbwalker.com">
    <img title="elbwalker" src="https://www.elbwalker.com/img/elbwalker_logo.png" width="256px"/>
  </a>
</p>

# Collector for walkerOS

[Source Code](https://github.com/elbwalker/walkerOS/tree/main/packages/collector)
&bull; [NPM Package](https://www.npmjs.com/package/@walkeros/collector)

The collector is the central **processing engine** of walkerOS that receives
events from sources, **enriches** them with additional data, applies consent
rules, and **routes** them to destinations. It acts as the **intelligent
middleware** between event capture and event delivery.

### What it does

The Collector transforms raw events into enriched, compliant data streams by:

- **Event processing** - Validates, normalizes, and enriches incoming events
- **Consent management** - Applies privacy rules and user consent preferences
- **Data enrichment** - Adds session data, user context, and custom properties
- **Destination routing** - Sends processed events to configured analytics
  platforms

### Key features

- **Compatibility** - Works in both web browsers and server environments
- **Privacy-first** - Built-in consent management and data protection
- **Event validation** - Ensures data quality and consistency
- **Flexible routing** - Send events to multiple destinations simultaneously

### Role in architecture

In the walkerOS data flow, the collector sits between sources and destinations:

```
Sources → Collector → Destinations
```

Sources capture events and send them to the collector, which processes and
routes them to your chosen destinations like Google Analytics, custom APIs, or
data warehouses.

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

## Installation

```bash
npm install @walkeros/collector
```

## Setup

### Basic setup

```typescript
import { createCollector } from '@walkeros/collector';

const config = {
  run: true,
  consent: { functional: true },
  sources: [
    // add your event sources
  ]
  },
};

const { collector, elb } = await createCollector(config);
```

### Advanced setup

```typescript
import { createCollector } from '@walkeros/collector';

const { collector, elb } = await createCollector({
  run: true,
  consent: { functional: true },
  sources: [
    // add your event sources
  ],
  destinations: [
    // add your event destinations
  ],
  verbose: true,
  onError: (error: unknown) => {
    console.error('Collector error:', error);
  },
  onLog: (message: string, level: 'debug' | 'info' | 'warn' | 'error') => {
    console.log(`[${level}] ${message}`);
  },
});
```

## Configuration

| Name           | Type       | Description                                                    | Required | Example                                    |
| -------------- | ---------- | -------------------------------------------------------------- | -------- | ------------------------------------------ |
| `run`          | `boolean`  | Automatically start the collector pipeline on initialization   | No       | `true`                                     |
| `sources`      | `array`    | Configurations for sources providing events to the collector   | No       | `[{ source, config }]`                     |
| `destinations` | `array`    | Configurations for destinations receiving processed events     | No       | `[{ destination, config }]`                |
| `consent`      | `object`   | Initial consent state to control routing of events             | No       | `{ analytics: true, marketing: false }`    |
| `verbose`      | `boolean`  | Enable verbose logging for debugging                           | No       | `false`                                    |
| `onError`      | `function` | Error handler triggered when the collector encounters failures | No       | `(error) => console.error(error)`          |
| `onLog`        | `function` | Custom log handler for collector messages                      | No       | `(message, level) => console.log(message)` |

## Contribute

Feel free to contribute by submitting an
[issue](https://github.com/elbwalker/walkerOS/issues), starting a
[discussion](https://github.com/elbwalker/walkerOS/discussions), or getting in
[contact](https://calendly.com/elb-alexander/30min).

## License

This project is licensed under the MIT License.
