# @walkeros/web-destination-snowplow

Snowplow Analytics destination for walkerOS - send events to your Snowplow
collector for powerful, privacy-first analytics.

## Installation

```bash
npm install @walkeros/collector @walkeros/web-destination-snowplow
```

## Quick Start

```typescript
import { startFlow } from '@walkeros/collector';
import { destinationSnowplow } from '@walkeros/web-destination-snowplow';

const { elb } = await startFlow({
  destinations: {
    snowplow: {
      destination: destinationSnowplow,
      config: {
        settings: {
          collectorUrl: 'https://collector.yourdomain.com',
          appId: 'my-web-app',
        },
      },
    },
  },
});

// Track events
await elb('page view', { title: 'Home' });
await elb('product view', { id: 'P123', name: 'Laptop', price: 999 });
```

## Configuration

### Settings

#### Required Settings

- **collectorUrl** (string): Your Snowplow collector endpoint URL

#### Optional Settings

- **appId** (string): Application identifier. Default: `'walkerOS'`
- **trackerName** (string): Tracker instance name. Default: `'sp'`
- **platform** (string): Platform identifier. Default: `'web'`
- **eventMethod** ('struct' | 'self'): Event tracking method. Default:
  `'struct'`
  - `'struct'`: Use structured events (category/action/label/property/value)
  - `'self'`: Use self-describing events (schema-based)
- **schema** (string): Iglu schema URI for self-describing events
- **pageViewTracking** (boolean): Enable automatic page view tracking. Default:
  `false`

### Event Mapping

Transform walkerOS events into Snowplow structured events:

```typescript
config: {
  settings: {
    collectorUrl: 'https://collector.example.com',
    appId: 'my-app',
  },
  mapping: {
    product: {
      view: {
        data: {
          map: {
            category: { value: 'product' },
            action: { value: 'view' },
            property: 'data.name',
            value: 'data.price',
          },
        },
      },
    },
    order: {
      complete: {
        data: {
          map: {
            category: { value: 'ecommerce' },
            action: { value: 'purchase' },
            property: 'data.id',
            value: 'data.total',
          },
        },
      },
    },
  },
}
```

## How It Works

This destination integrates with the Snowplow JavaScript Tracker using the
`window.snowplow()` queue function, similar to how Google Analytics uses
`gtag()` or Meta Pixel uses `fbq()`.

### Tracker Interface

The Snowplow tracker exposes a global queue function:

```javascript
// Initialization
window.snowplow('newTracker', 'sp', 'https://collector.example.com', {
  appId: 'my-app',
  platform: 'web',
});

// Tracking events
window.snowplow('trackPageView');
window.snowplow(
  'trackStructEvent',
  'category',
  'action',
  'label',
  'property',
  value,
);
window.snowplow('trackSelfDescribingEvent', {
  event: {
    schema: 'iglu:vendor/name/jsonschema/1-0-0',
    data: {
      /* event data */
    },
  },
});
```

### Integration with walkerOS

This destination automatically:

1. **Initializes the tracker** - Calls `newTracker()` with your configuration
2. **Maps events** - Transforms walkerOS events into Snowplow format
3. **Sends events** - Calls the appropriate Snowplow tracking method

You don't need to interact with `window.snowplow()` directly - just use the
walkerOS `elb()` function.

### Script Loading

The Snowplow tracker script can be loaded automatically:

```typescript
config: {
  settings: {
    collectorUrl: 'https://collector.example.com',
  },
  loadScript: true, // Automatically loads Snowplow tracker from CDN
}
```

Or manually:

```html
<script src="https://cdn.jsdelivr.net/npm/@snowplow/javascript-tracker@latest/dist/sp.js"></script>
```

## Examples

### Structured Events (Default)

```typescript
// Configure for structured events
config: {
  settings: {
    collectorUrl: 'https://collector.example.com',
    eventMethod: 'struct', // Default
  },
}

// Track events
await elb('product view', { id: 'P123', name: 'Laptop', price: 999 });
// Sends: category='product', action='view', property='Laptop', value=999
```

### Self-Describing Events

```typescript
// Configure for self-describing events
config: {
  settings: {
    collectorUrl: 'https://collector.example.com',
    eventMethod: 'self',
    schema: 'iglu:com.mycompany/product_view/jsonschema/1-0-0',
  },
}

// Track events
await elb('product view', { id: 'P123', price: 999 });
// Sends self-describing event with your schema
```

### Page View Tracking

```typescript
await elb('page view', {
  title: 'Product Page',
  path: '/products/laptop',
});
```

### E-commerce Tracking

```typescript
// Product view
await elb('product view', {
  id: 'P123',
  name: 'Laptop',
  price: 999,
  category: 'Electronics',
});

// Add to cart
await elb('product add', {
  id: 'P123',
  quantity: 1,
});

// Purchase
await elb('order complete', {
  id: 'ORDER123',
  total: 1999,
  currency: 'USD',
  items: 2,
});
```

## Snowplow Event Types

### Structured Events

Structured events follow Snowplow's category/action/label/property/value
pattern:

- **category**: Event category (e.g., 'product', 'order', 'user')
- **action**: Action performed (e.g., 'view', 'click', 'purchase')
- **label**: Optional label for additional context
- **property**: Optional property name
- **value**: Optional numeric value

### Self-Describing Events

Self-describing events use Iglu schemas for structured data:

```typescript
{
  schema: 'iglu:com.example/event/jsonschema/1-0-0',
  data: {
    // Your event data
  }
}
```

## Advanced Usage

### Multiple Trackers

```typescript
config: {
  settings: {
    collectorUrl: 'https://collector.example.com',
    trackerName: 'mainTracker',
  },
}

// Can run multiple instances with different tracker names
```

### Custom Mapping with Functions

```typescript
config: {
  mapping: {
    product: {
      view: {
        data: {
          map: {
            category: { value: 'product' },
            action: { value: 'view' },
            property: 'data.name',
            value: {
              fn: (event) => event.data.price * 1.2, // Add tax
            },
          },
        },
      },
    },
  },
}
```

## Integration with Snowplow Pipeline

This destination works with any standard Snowplow pipeline:

1. **Tracker** (this destination) → Sends events
2. **Collector** → Receives and validates events
3. **Enrich** → Enriches events with additional data
4. **Storage** → Loads into your data warehouse (Redshift, BigQuery, Snowflake,
   etc.)

Make sure your `collectorUrl` points to your Snowplow collector endpoint.

## Troubleshooting

### Events not appearing in Snowplow

1. **Check Collector URL**: Verify your collector URL is correct

   ```typescript
   settings: {
     collectorUrl: 'https://collector.example.com', // Should not include /i or /com.snowplowanalytics.snowplow/tp2
   }
   ```

2. **Check Browser Console**: Look for Snowplow errors
   - Open DevTools → Console
   - Look for `[Snowplow]` prefixed messages

3. **Verify Network Requests**: Check Network tab in DevTools
   - Look for requests to your collector URL
   - Check request payload

4. **Test with Simple Event**:
   ```typescript
   await elb('page view', { title: 'Test' });
   ```

### Initialization Errors

If you see `[Snowplow] Collector URL is required`:

- Ensure `collectorUrl` is provided in settings
- Check for typos in configuration

### Schema Validation Errors

For self-describing events, ensure:

- Schema URI is correctly formatted: `iglu:vendor/name/format/version`
- Schema exists in your Iglu registry
- Event data matches the schema definition

## Local Testing with Docker

You can test your walkerOS Snowplow integration locally using **Snowplow
Micro**, a lightweight Docker-based collector that validates and enriches events
just like a real Snowplow pipeline.

### Quick Start with Snowplow Micro

1. **Start Snowplow Micro**:

   ```bash
   docker run -p 9090:9090 snowplow/snowplow-micro:3.0.1
   ```

2. **Configure walkerOS to use Micro**:

   ```typescript
   const { elb } = await startFlow({
     destinations: {
       snowplow: {
         destination: destinationSnowplow,
         config: {
           settings: {
             collectorUrl: 'localhost:9090', // Point to Micro
             appId: 'test-app',
           },
         },
       },
     },
   });
   ```

3. **Send test events**:

   ```typescript
   await elb('page view', { title: 'Test Page' });
   await elb('product view', { id: 'P123', price: 999 });
   ```

4. **Inspect events**:
   - **Web UI**: Open http://localhost:9090/micro/ui in your browser
   - **API**: Query events via REST endpoints

### Snowplow Micro API Endpoints

Snowplow Micro provides several endpoints for inspecting tracked events:

```bash
# Get all events (good + bad)
curl http://localhost:9090/micro/all

# Get successfully validated events
curl http://localhost:9090/micro/good

# Get events that failed validation
curl http://localhost:9090/micro/bad

# Reset the event cache
curl -X POST http://localhost:9090/micro/reset
```

### Example Response

When you query `/micro/good`, you'll see events in this format:

```json
[
  {
    "event": "unstruct",
    "event_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "app_id": "test-app",
    "platform": "web",
    "unstruct_event": {
      "schema": "iglu:com.snowplowanalytics.snowplow/unstruct_event/jsonschema/1-0-0",
      "data": {
        "schema": "iglu:com.example/product_view/jsonschema/1-0-0",
        "data": {
          "id": "P123",
          "price": 999
        }
      }
    }
  }
]
```

### Advanced Docker Usage

**Export events to TSV**:

```bash
docker run -p 9090:9090 snowplow/snowplow-micro:3.0.1 --output-tsv > events.tsv
```

**Export events to JSON**:

```bash
docker run -p 9090:9090 snowplow/snowplow-micro:3.0.1 --output-json > events.json
```

**Use custom port**:

```bash
docker run -p 5000:9090 snowplow/snowplow-micro:3.0.1
# Then set collectorUrl to 'localhost:5000'
```

### Automated Testing

Integrate Snowplow Micro into your test suite:

```typescript
// test/snowplow.test.ts
import { startFlow } from '@walkeros/collector';
import { destinationSnowplow } from '@walkeros/web-destination-snowplow';

describe('Snowplow Integration', () => {
  let elb;

  beforeAll(async () => {
    ({ elb } = await startFlow({
      destinations: {
        snowplow: {
          destination: destinationSnowplow,
          config: {
            settings: {
              collectorUrl: 'localhost:9090',
              appId: 'test-app',
            },
          },
        },
      },
    }));
  });

  afterEach(async () => {
    // Reset Micro between tests
    await fetch('http://localhost:9090/micro/reset', { method: 'POST' });
  });

  test('tracks page view events', async () => {
    await elb('page view', { title: 'Home' });

    // Wait a bit for event to be processed
    await new Promise((resolve) => setTimeout(resolve, 100));

    const response = await fetch('http://localhost:9090/micro/good');
    const events = await response.json();

    expect(events).toHaveLength(1);
    expect(events[0].event).toBe('page_view');
  });

  test('tracks product events', async () => {
    await elb('product view', { id: 'P123', price: 999 });

    await new Promise((resolve) => setTimeout(resolve, 100));

    const response = await fetch('http://localhost:9090/micro/good');
    const events = await response.json();

    expect(events).toHaveLength(1);
    expect(events[0].app_id).toBe('test-app');
  });
});
```

### Integration with E2E Testing

Use Snowplow Micro with Cypress, Playwright, or other E2E frameworks:

```javascript
// cypress/e2e/tracking.cy.js
describe('Snowplow Tracking', () => {
  beforeEach(() => {
    // Reset Micro before each test
    cy.request('POST', 'http://localhost:9090/micro/reset');
  });

  it('tracks user journey', () => {
    cy.visit('/');
    cy.get('[data-elbaction="click"]').click();

    // Verify events in Micro
    cy.request('http://localhost:9090/micro/good').then((response) => {
      expect(response.body).to.have.length.greaterThan(0);
    });
  });
});
```

### Benefits of Testing with Micro

- ✅ **No Cloud Setup**: Test locally without Snowplow cloud infrastructure
- ✅ **Fast Feedback**: Instant validation of tracking implementation
- ✅ **Event Inspection**: See exactly what data is being sent
- ✅ **Schema Validation**: Catch schema errors before production
- ✅ **CI/CD Integration**: Run in Docker containers in your pipeline
- ✅ **No Data Costs**: Test without sending data to production

### Resources

- [Snowplow Micro Documentation](https://docs.snowplow.io/docs/data-product-studio/data-quality/snowplow-micro/)
- [Snowplow Micro on Docker Hub](https://hub.docker.com/r/snowplow/snowplow-micro)
- [Automated Testing Guide](https://docs.snowplow.io/docs/data-product-studio/data-quality/snowplow-micro/automated-testing/)

## Resources

- [Snowplow Documentation](https://docs.snowplow.io/)
- [Snowplow Browser Tracker](https://docs.snowplow.io/docs/sources/trackers/web-trackers/)
- [walkerOS Documentation](https://docs.elbwalker.com)
- [GitHub Repository](https://github.com/elbwalker/walkerOS)

## License

MIT
