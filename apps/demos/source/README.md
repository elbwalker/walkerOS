<div align="center">
  <a href="https://www.walkeros.io">
    <img alt="elbwalker" src="https://www.walkeros.io/img/elbwalker-logo.png" height="40px" />
  </a>
</div>

# walkerOS Source Demo

A demo source that generates walkerOS events from configuration - perfect for
testing, demonstrations, and examples.

> Learn more at [walkeros.io/docs](https://www.walkeros.io/docs/sources/)

## What It Does

- Generates walkerOS events from a configuration array
- Supports delayed event execution for testing scenarios
- Zero external dependencies - ideal for demos and testing
- Simple push interface compatible with walkerOS architecture

## Installation

```bash
npm install @walkeros/source-demo
```

## Quick Start

```typescript
import { startFlow } from '@walkeros/collector';
import { sourceDemo } from '@walkeros/source-demo';

const { collector } = await startFlow({
  sources: {
    demo: {
      code: sourceDemo,
      config: {
        settings: {
          events: [
            { name: 'page view', data: { title: 'Home' } },
            { name: 'product view', data: { id: 'P123' }, delay: 1000 },
          ],
        },
      },
    },
  },
});
```

## Configuration

| Name   | Type                  | Description                    | Required |
| ------ | --------------------- | ------------------------------ | -------- |
| events | `Array<PartialEvent>` | Array of events to generate    | Yes      |
| delay  | `number` (per event)  | Optional delay in milliseconds | No       |

## Example

Complete example showing the demo source with a destination:

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
              name: 'page view',
              data: { title: 'Home Page', path: '/' },
            },
            {
              name: 'product view',
              data: { id: 'P123', name: 'Laptop', price: 999 },
              delay: 1000, // Wait 1 second before firing
            },
            {
              name: 'order complete',
              data: { id: 'O456', value: 999 },
              delay: 2000, // Wait 2 seconds before firing
            },
          ],
        },
      },
    },
  },
  destinations: {
    demo: destinationDemo,
  },
});

// Events will be generated automatically with specified delays
```

## Contribute

We welcome contributions! Please see our
[contribution guidelines](https://github.com/elbwalker/walkerOS) for more
information.

## License

MIT
