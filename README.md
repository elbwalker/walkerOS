<p align="left">
  <a href="https://elbwalker.com">
    <img title="elbwalker" src="https://www.elbwalker.com/img/elbwalker_logo.png" width="256px"/>
  </a>
</p>

# walkerOS: Open-Source Event Data Collection

<div align="left">
  <a href="https://github.com/elbwalker/walkerOS/blob/main/LICENSE"><img src="https://img.shields.io/github/license/elbwalker/walkerOS" /></a>
  <a href="https://www.elbwalker.com/docs/"><img src="https://img.shields.io/badge/docs-www.elbwalker.com/docs-yellow" alt="walkerOS Documentation"></a>
  <a href="https://github.com/elbwalker/walkerOS/tree/main/apps/demos/react"><img src="https://img.shields.io/badge/React_demo-blue" alt="React demo"></a>
  <a href="https://discord.gg/yBw4uPp6V7"><img src="https://img.shields.io/discord/959129398208258048?label=discord" alt="Discord"></a>
</div>

walkerOS captures, structures, and routes events with built-in support for
consent management — all directly in your code. No fragile UI configs. No
black-box logic. Just vendor-agnostic **tracking you can version, test, and
trust**.

The project started as the web tracking library walker.js, and has evolved into
a complete **first-party tracking system** for modern teams and the modern web.

## Why walkerOS?

- **Independence**: Make your data collection independent from single vendor
  specifications to reduce complexity and extra code whenever you add or remove
  a new service. Keep maintenance effort to a minimum.
- **Scalability**: DOM-based, component-level frontend tagging makes tracking
  user behavior declarative, reusable, and easy to maintain.
- **Privacy-first approach**: Built-in consent handling and privacy controls
  help you meet compliance from day one.
- **Type-safe tracking**: Built with TypeScript to catch tracking errors at
  compile time, not in production. Get IDE autocomplete for APIs and destination
  configs, prevent data structure mistakes.

## How it works

![walkerOS event flow](website/static/diagrams/walkerosflowdark.png)

## Quick Start

### With a Bundler (npm)

Install the required packages from npm:

```bash
npm install @walkeros/collector @walkeros/web-source-browser
```

Initialize walkerOS in your project:

```javascript
import { createCollector } from '@walkeros/collector';
import { createSource } from '@walkeros/core';
import { sourceBrowser } from '@walkeros/web-source-browser';

// Initialize walkerOS
export async function initializeWalker() {
  const { collector } = await createCollector({
    sources: {
      browser: createSource(sourceBrowser, {
        settings: {
          pageview: true,
          session: true,
          elb: 'elb', // Browser source will set window.elb automatically
        },
      }),
    },
    destinations: {
      console: {
        push: (event) => console.log('Event:', event),
      },
    },
  });
}
```

### With a Script Tag

For websites without build tools, you can install from a CDN:

```html
<script>
  // Load the collector, core utilities, and source
  const { createCollector } = await import(
    'https://cdn.jsdelivr.net/npm/@walkeros/collector/dist/index.mjs'
  );
  const { createSource } = await import(
    'https://cdn.jsdelivr.net/npm/@walkeros/core/dist/index.mjs'
  );
  const { sourceBrowser } = await import(
    'https://cdn.jsdelivr.net/npm/@walkeros/web-source-browser/dist/index.mjs'
  );

  // Initialize walkerOS
  const { collector, elb } = await createCollector({
    destinations: {
      console: {
        push: (event) => console.log('Event:', event),
      },
    },
    sources: {
      browser: createSource(sourceBrowser, {
        settings: {
          prefix: 'data-elb',
          pageview: true,
          session: true,
        },
      }),
    },
  });
</script>
```

## Example: React

Here's a quick look at how to integrate walkerOS into a React application.

**1. Create a walker setup file:**

```tsx
// src/walker.ts
import type { Collector, WalkerOS } from '@walkeros/core';
import { createCollector } from '@walkeros/collector';
import { createSource } from '@walkeros/core';
import { createTagger, sourceBrowser } from '@walkeros/web-source-browser';

declare global {
  interface Window {
    elb: WalkerOS.Elb;
    walker: Collector.Instance;
  }
}

export async function initializeWalker(): Promise<void> {
  if (window.walker) return;

  const { collector } = await createCollector({
    run: false, // Defer run to handle route changes
    sources: {
      browser: createSource(sourceBrowser, {
        settings: { pageview: true, session: true, elb: 'elb' },
      }),
    },
    destinations: {
      console: { push: (event) => console.log('Event:', event) },
    },
  });

  window.walker = collector;
}

const taggerInstance = createTagger();
export function tagger(entity?: string) {
  return taggerInstance(entity);
}
```

**2. Integrate into your App component:**

```tsx
// src/App.tsx
import { useLocation } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import { initializeWalker } from './walker';

function App() {
  const location = useLocation();
  const hasInitialized = useRef(false);
  const firstRun = useRef(true);

  useEffect(() => {
    // Prevent React StrictMode double execution
    if (!hasInitialized.current) {
      initializeWalker();
      hasInitialized.current = true;
    }
  }, []);

  useEffect(() => {
    // Use walker run to trigger page views on route changes
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    window.elb('walker run');
  }, [location]);

  // ... your app routes
}
```

**3. Tag your components:**

```tsx
// src/components/ProductDetail.tsx
import { tagger } from '../walker';

function ProductDetail({ product }) {
  return (
    <div {...tagger('product').data('id', product.id).get()}>
      <h1>{product.name}</h1>
      <button {...tagger().action('click', 'add').get()}>Add to Cart</button>
    </div>
  );
}
```

## Destinations

Destinations are the endpoints where walkerOS sends your processed events. They
transform standardized walkerOS events into the specific formats required by
analytics platforms, marketing tools, and data warehouses.

#### Web Destinations

- **[API](https://www.elbwalker.com/docs/destinations/web/api)** - Send events
  to your own endpoints
- **[Google (gtag)](https://www.elbwalker.com/docs/destinations/web/gtag/)** -
  GA4, Google Ads, and GTM integration
- **[Meta Pixel](https://www.elbwalker.com/docs/destinations/web/meta-pixel)** -
  Facebook and Instagram advertising
- **[Plausible Analytics](https://www.elbwalker.com/docs/destinations/web/plausible)** -
  Privacy-focused web analytics
- **[Piwik PRO](https://www.elbwalker.com/docs/destinations/web/piwikpro)** -
  Privacy-focused analytics platform

#### Server Destinations

- **[AWS Firehose](https://www.elbwalker.com/docs/destinations/server/aws)** -
  Amazon cloud services integration
- **[GCP BigQuery](https://www.elbwalker.com/docs/destinations/server/gcp)** -
  GCP services and BigQuery
- **[Meta Conversions API](https://www.elbwalker.com/docs/destinations/server/meta-capi)** -
  Server-side Facebook/Instagram tracking

## Contributing

⭐️ Help us grow and star us. See our
[Contributing Guidelines](https://www.elbwalker.com/docs/contributing) to get
involved.

## Support

Need help? Start a
[discussion](https://github.com/elbwalker/walkerOS/discussions), or reach out
via [email](mailto:hello@elbwalker.com).

For more insights, visit the
[talks repository](https://github.com/elbwalker/talks).

## License

Licensed under the [MIT License](./LICENSE).
