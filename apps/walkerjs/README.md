# Walker.js

A ready-to-use walkerOS bundle that combines the browser source, collector, and
dataLayer support into a single JavaScript file. Perfect for quickly adding
privacy-friendly event tracking to any website.

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

## Quick Start

### 1. Add elbLayer Function (Recommended)

Add this before walker.js loads to queue events:

```html
<script>
  function elb() {
    (window.elbLayer = window.elbLayer || []).push(arguments);
  }
</script>
```

### 2. Include walker.js

```html
<!-- Recommended: Async loading with configuration -->
<script async data-elbconfig="elbConfig" src="./walker.js"></script>

<!-- Or from CDN -->
<script
  async
  data-elbconfig="elbConfig"
  src="https://cdn.jsdelivr.net/npm/@walkeros/walker.js@latest/dist/walker.js"
></script>
```

### 3. Configure

#### Option A: Default Configuration

Just load the `walker.js` script - it will look for `window.elbConfig`:

```html
<script>
  window.elbConfig = {
    /* your config */
  };
</script>
<script async src="./walker.js"></script>
```

#### Option B: Named Configuration Object

Use `data-elbconfig` on the script tag to define the configuration object.

```html
<script>
  window.trackingConfig = {
    elb: 'elb', // Global function name
    name: 'walkerjs', // Global instance name
    dataLayer: true, // Enable dataLayer integration
    collector: {
      destinations: {
        // Add your destinations here
      },
    },
  };
</script>
<script async data-elbconfig="trackingConfig" src="./walker.js"></script>
```

#### Option C: Inline Configuration

Configure directly in the script tag. Use simple key:value pairs separated by
semicolon.

```html
<script
  async
  data-elbconfig="elb:track;run:true;instance:myWalker"
  src="./walker.js"
></script>
```

### 3. Track Events

#### Automatic DOM Tracking

Add data attributes to your HTML:

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

#### Manual Event Tracking

```javascript
// Using the global elb function
elb('product add', {
  id: '123',
  price: 29.99,
});
```

## Configuration

### Configuration Options

Walker.js can be configured in multiple ways:

1. **Script tag with `data-elbconfig`** - Highest priority
2. **`window.elbConfig`** - Default fallback
3. **Manual initialization** - When `run: false`

### Full Configuration Object

```javascript
window.elbConfig = {
  // Global configuration
  elb: 'elb', // Global function name (default: 'elb')
  name: 'walkerjs', // Global instance name
  run: true, // Auto-initialize (default: true)

  // Browser source settings
  browser: {
    run: true, // Auto-start DOM tracking
    session: true, // Enable session tracking
    scope: document.body, // Tracking scope
  },

  // DataLayer integration
  dataLayer: true, // Enable dataLayer
  // or detailed config:
  dataLayer: {
    name: 'dataLayer', // DataLayer variable name
    prefix: 'dataLayer', // Event prefix
  },

  // Collector configuration
  collector: {
    consent: { functional: true }, // Default consent state
    destinations: {
      // Your destinations
    },
  },
};
```

### Destination Configuration

```javascript
const walkerjs = Walkerjs({
  collector: {
    destinations: {
      console: {
        type: 'console',
        push: (event) => console.log(event),
      },

      api: {
        type: 'custom-api',
        push: async (event) => {
          await fetch('/api/events', {
            method: 'POST',
            body: JSON.stringify(event),
          });
        },
      },
    },
  },
});
```

## Advanced Usage

### Async Loading & Event Queueing

Walker.js supports async loading with automatic event queueing:

```html
<script>
  // 1. Define elb function to queue events
  function elb() {
    (window.elbLayer = window.elbLayer || []).push(arguments);
  }

  // 2. Track events immediately (even before walker.js loads)
  elb('page view');
  elb('product view', { id: '123', name: 'Blue T-Shirt' });
</script>

<!-- 3. Walker.js will process queued events when it loads -->
<script async data-elbconfig="elbConfig" src="./walker.js"></script>
```

**Benefits:**

- No timing issues with async scripts
- Events are never lost
- Works with any loading strategy (async, defer, dynamic)
- Zero dependencies for the queue function

### Build Variants

Walker.js provides multiple build formats:

- `walker.js` - Standard IIFE bundle for browsers
- `index.es5.js` - GTM-compatible ES2015 build
- `index.mjs` - ES modules for modern bundlers
- `index.js` - CommonJS for Node.js environments

## API Reference

### Factory Function

#### `createWalkerjs(config?): Walkerjs.Instance`

Creates a new walker.js instance with the provided configuration.

### Instance Properties

- `collector` - The walkerOS collector instance
- `elb` - Browser push function for event tracking

### Additional Methods

- `getAllEvents(scope?, prefix?)` - Get all trackable events on the page
- `getEvents(target, trigger, prefix?)` - Get events for a specific element and
  trigger
- `getGlobals(prefix?, scope?)` - Get global properties from the page

### Utility Functions

You can also import and use the utility functions directly:

```javascript
import { getAllEvents, getEvents, getGlobals } from '@walkeros/walker.js';

// Get all events on the page
const events = getAllEvents();

// Get events for a specific button click
const button = document.querySelector('button');
const clickEvents = getEvents(button, 'click');

// Get global properties
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

## License

MIT License - see LICENSE file for details.

## Contributing

This package is part of the walkerOS monorepo. Please see the main repository
for contribution guidelines.

## Related Packages

- [@walkeros/collector](../../../packages/collector) - Core collector
- [@walkeros/web-source-browser](../../../packages/web/sources/browser) -
  Browser source
- [@walkeros/web-source-datalayer](../../../packages/web/sources/dataLayer) -
  DataLayer source
