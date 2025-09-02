# walker.js

Walker.js is a pre-built walkerOS application that combines both the
[browser](/docs/sources/web/browser/) and
[dataLayer](/docs/sources/web/dataLayer/) sources with the
[collector](/docs/collector/) and a default `dataLayer` destination into a
pre-build package. It's designed for users who want instant web tracking without
complex setup or configuration.

## Features

- 🚀 **Drop-in ready** - Single JavaScript file with everything included
- 🔒 **Privacy-first** - Built on walkerOS's privacy-centric architecture
- 🎯 **DOM tracking** - Automatic event collection via data attributes
- 📊 **DataLayer support** - Compatible with existing dataLayer implementations
- 🔧 **Flexible configuration** - Multiple ways to configure (inline, object, or
  default)
- ⚡ **Async loading** - Works seamlessly with async/defer script loading
- 📦 **Queue support** - Events are queued until walker.js loads (elbLayer)
- 🧪 **Well tested** - Comprehensive test suite included

## Installation

### Option 1: NPM Package

```bash
npm install @walkeros/walker.js
```

### Option 2: CDN

```html
<script
  async
  data-elbconfig="elbConfig"
  src="https://cdn.jsdelivr.net/npm/@walkeros/walker.js@latest/dist/walker.js"
></script>
```

## Basic Setup

### 1. Add Event Queueing (Recommended)

Add this script before walker.js loads to queue events during initialization:

```html
<script>
  function elb() {
    (window.elbLayer = window.elbLayer || []).push(arguments);
  }
</script>
```

### 2. Include Walker.js

```html
<script async data-elbconfig="elbConfig" src="./walker.js"></script>
```

### 3. Configure Destinations

```html
<script>
  window.elbConfig = {
    collector: {
      destinations: {
        console: {
          push: (event) => console.log('Event:', event),
        },
        api: {
          push: async (event) => {
            await fetch('/api/events', {
              method: 'POST',
              body: JSON.stringify(event),
            });
          },
        },
      },
    },
  };
</script>
```

## Configuration Options

Walker.js supports multiple configuration approaches with different priorities:

1.  **Script tag `data-elbconfig`** (highest priority)
2.  **`window.elbConfig`** (default fallback)
3.  **Manual initialization** (when `run: false`)

### Settings

| Name        | Type                | Default                                                              | Description                                                                                                      |
| :---------- | :------------------ | :------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------- |
| `elb`       | `string`            | `"elb"`                                                              | Global function name for event tracking                                                                          |
| `name`      | `string`            | `"walkerjs"`                                                         | Global instance name                                                                                             |
| `run`       | `boolean`           | `true`                                                               | Auto-initialize walker.js on load                                                                                |
| `browser`   | `object \| boolean` | `{ run: true, session: true, scope: document.body, pageview: true }` | [Browser source configuration](https://www.elbwalker.com/docs/sources/web/browser/)                              |
| `dataLayer` | `object \| boolean` | `false`                                                              | [DataLayer source configuration](https://www.elbwalker.com/docs/sources/web/dataLayer)                           |
| `collector` | `object`            | `{}`                                                                 | [Collector configuration](https://www.elbwalker.com/docs/collector/) including destinations and consent settings |

#### Browser Source Settings

| Name               | Type      | Default         | Description                       |
| :----------------- | :-------- | :-------------- | :-------------------------------- |
| `browser.run`      | `boolean` | `true`          | Auto-start DOM tracking           |
| `browser.session`  | `boolean` | `true`          | Enable session tracking           |
| `browser.scope`    | `Element` | `document.body` | DOM element scope for tracking    |
| `browser.pageview` | `boolean` | `true`          | Enable automatic page view events |

#### DataLayer Settings

| Name               | Type      | Default       | Description                                |
| :----------------- | :-------- | :------------ | :----------------------------------------- |
| `dataLayer`        | `boolean` | `false`       | Enable dataLayer integration with defaults |
| `dataLayer.name`   | `string`  | `"dataLayer"` | DataLayer variable name                    |
| `dataLayer.prefix` | `string`  | `"dataLayer"` | Event prefix for dataLayer events          |

#### Collector Settings

| Name                     | Type     | Default                | Description                                                               |
| :----------------------- | :------- | :--------------------- | :------------------------------------------------------------------------ |
| `collector.consent`      | `object` | `{ functional: true }` | Default consent state                                                     |
| `collector.destinations` | `object` | `{}`                   | [Destination configurations](https://www.elbwalker.com/docs/destinations) |

### Full Configuration Object

```javascript
window.elbConfig = {
  // Global settings
  elb: 'elb', // Global function name (default: 'elb')
  name: 'walkerjs', // Global instance name
  run: true, // Auto-initialize (default: true)

  // Browser source settings
  browser: {
    run: true, // Auto-start DOM tracking
    session: true, // Enable session tracking
    scope: document.body, // Tracking scope
    pageview: true, // Enable automatic page views
  },

  // DataLayer integration
  dataLayer: true, // Enable dataLayer
  // or detailed config:
  // dataLayer: {
  //   name: 'dataLayer', // DataLayer variable name
  //   prefix: 'dataLayer', // Event prefix
  // },

  // Collector configuration
  collector: {
    consent: { functional: true }, // Default consent state
    destinations: {
      // Your destinations here
      console: {
        push: (event) => console.log('Event:', event),
      },
    },
  },
};
```

### Inline Configuration

Configure directly in the script tag using simple key:value pairs:

```html
<script
  async
  data-elbconfig="elb:track;run:true;instance:myWalker"
  src="./walker.js"
></script>
```

### Named Configuration Object

Use a custom configuration object name:

```html
<script>
  window.trackingConfig = {
    elb: 'track',
    collector: {
      destinations: {
        // Your destinations
      },
    },
  };
</script>
<script async data-elbconfig="trackingConfig" src="./walker.js"></script>
```

## Usage

### Automatic DOM Tracking

Walker.js automatically tracks events based on HTML data attributes:

```html
<!-- Product tracking -->
<div data-elb="product" data-elb-product="id:123;name:Blue T-Shirt;price:29.99">
  <button data-elbaction="click:add">Add to Cart</button>
</div>

<!-- Global properties -->
<div data-elbglobals="pagetype:product_detail"></div>

<!-- Context information -->
<div data-elbcontext="section:recommendations"></div>
```

For detailed information on data attributes, see the
[Browser Source documentation](https://www.elbwalker.com/docs/sources/web/browser/tagging).

### Manual Event Tracking

Use the global `elb` function for manual tracking:

```javascript
// Simple event
elb('button click', {
  label: 'interesting',
});
```

### DataLayer Integration

Walker.js can integrate with existing dataLayer implementations:

```javascript
// Enable dataLayer integration
window.elbConfig = {
  dataLayer: true, // Uses window.dataLayer by default
};

// Existing dataLayer events will be processed
dataLayer.push({
  event: 'purchase',
  ecommerce: {
    transaction_id: '12345',
    value: 25.42,
  },
});
```

## Advanced Features

### Async Loading & Event Queueing

Walker.js handles async loading gracefully with automatic event queueing:

```html
<script>
  // 1. Define elb function to queue events
  function elb() {
    (window.elbLayer = window.elbLayer || []).push(arguments);
  }

  // 2. Track events immediately (even before walker.js loads)
  elb('product view', { id: '123', name: 'Blue T-Shirt' });
</script>

<!-- 3. Walker.js processes queued events when it loads -->
<script async data-elbconfig="elbConfig" src="./walker.js"></script>
```

### Build Variants

Walker.js provides multiple build formats for different environments:

- `walker.js` - Standard IIFE bundle for browsers
- `index.es5.js` - GTM-compatible ES2015 build
- `index.mjs` - ES modules for modern bundlers
- `index.js` - CommonJS for Node.js environments

### Programmatic Usage

Use walker.js programmatically in applications:

```javascript
import { createWalkerjs } from '@walkeros/walker.js';

const { collector, elb } = await createWalkerjs({
  collector: {
    destinations: {
      console: { push: console.log },
    },
  },
  browser: {
    session: true,
    pageview: true,
  },
});
```

## Destination Configuration

Configure multiple destinations for your events:

```javascript
window.elbConfig = {
  collector: {
    destinations: {
      // Console logging for development
      console: {
        push: (event) => console.log('Walker.js Event:', event),
      },

      // Custom API endpoint
      api: {
        push: async (event) => {
          await fetch('/api/events', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(event),
          });
        },
      },
    },
  },
};
```

For comprehensive destination options, see the
[Destinations documentation](https://www.elbwalker.com/docs/destinations/).

## Troubleshooting

### Common Issues

**Events not firing:** Check that walker.js loaded and configuration is valid.

**Missing events:** Ensure event queueing function is added before walker.js.

**Configuration not applied:** Verify `data-elbconfig` points to the correct
object name.

## API Reference

### Factory Function

```typescript
createWalkerjs(config?: Config): Promise<Instance>
```

Creates a new walker.js instance with the provided configuration.

### Instance Properties

- `collector` - The walkerOS collector instance
- `elb` - Browser push function for event tracking

### Utility Functions

```javascript
import { getAllEvents, getEvents, getGlobals } from '@walkeros/walker.js';

// Get all trackable events on the page
const events = getAllEvents();

// Get events for a specific element and trigger
const button = document.querySelector('button');
const clickEvents = getEvents(button, 'click');

// Get global properties from the page
const globals = getGlobals();
```

## Development

### Building

```bash
npm run build
```

### Testing

```bash
npm test       # Run tests once
npm run dev    # Watch mode
```

### Development Server

```bash
npm run preview       # Serve examples on localhost:3333
```

## Related Documentation

- **[Browser Source](https://www.elbwalker.com/docs/sources/web/browser/)** -
  Detailed DOM tracking capabilities
- **[Collector](https://www.elbwalker.com/docs/collector/)** - Event processing
  and routing
- **[Destinations](https://www.elbwalker.com/docs/destinations/)** - Available
  destination options
- **[DataLayer Source](https://www.elbwalker.com/docs/sources/web/dataLayer/)** -
  DataLayer integration details

Walker.js combines all these components into a single, easy-to-use package
perfect for getting started with walkerOS quickly.

## Contributing

This package is part of the walkerOS monorepo. Please see the main repository
for contribution guidelines.

## License

MIT License - see LICENSE file for details.
