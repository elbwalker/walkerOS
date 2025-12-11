<div align="center">
  <a href="https://www.walkeros.io">
    <img alt="elbwalker" src="https://www.walkeros.io/img/elbwalker-logo.png" height="40px" />
  </a>
</div>

# walkerOS Destination Demo

A demo destination that logs walkerOS events to console with optional field
filtering - perfect for debugging, testing, and demonstrations.

> Learn more at [walkeros.io/docs](https://www.walkeros.io/docs/destinations/)

## What It Does

- Logs events to console with JSON formatting
- Supports field filtering using dot notation
- Zero external dependencies - ideal for demos and debugging
- Simple destination interface compatible with walkerOS architecture

## Installation

```bash
npm install @walkeros/destination-demo
```

## Quick Start

```typescript
import { startFlow } from '@walkeros/collector';
import { destinationDemo } from '@walkeros/destination-demo';

const { collector } = await startFlow({
  destinations: {
    demo: destinationDemo,
  },
});

await collector.push('page view', { title: 'Home' });
// Console output: [demo] { "name": "page view", "data": { "title": "Home" }, ... }
```

## Configuration

| Name   | Type            | Description                                      | Required |
| ------ | --------------- | ------------------------------------------------ | -------- |
| name   | `string`        | Custom prefix for log messages (default: "demo") | No       |
| values | `Array<string>` | Dot notation paths to extract specific fields    | No       |

## Example

Complete example showing filtered field logging:

```typescript
import { startFlow } from '@walkeros/collector';
import { sourceDemo } from '@walkeros/source-demo';
import { destinationDemo } from '@walkeros/destination-demo';

const { collector } = await startFlow({
  sources: {
    demo: {
      code: sourceDemo,
      config: {
        settings: {
          events: [
            {
              name: 'product view',
              data: { id: 'P123', name: 'Laptop', price: 999 },
            },
          ],
        },
      },
    },
  },
  destinations: {
    demo: {
      ...destinationDemo,
      config: {
        settings: {
          name: 'MyApp',
          values: ['name', 'data.id', 'data.name', 'timestamp'],
        },
      },
    },
  },
});

// Console output: [MyApp] {
//   "name": "product view",
//   "data.id": "P123",
//   "data.name": "Laptop",
//   "timestamp": 1647261462000
// }
```

### Without Field Filtering

Omit the `values` setting to log the complete event object:

```typescript
const { collector } = await startFlow({
  destinations: {
    demo: {
      ...destinationDemo,
      config: {
        settings: {
          name: 'Debug',
        },
      },
    },
  },
});

// Console output: [Debug] { "name": "page view", "data": {...}, "context": {...}, ... }
```

## Contribute

We welcome contributions! Please see our
[contribution guidelines](https://github.com/elbwalker/walkerOS) for more
information.

## License

MIT
