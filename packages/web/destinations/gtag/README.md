# @walkeros/web-destination-gtag

Unified Google destination for walkerOS supporting Google Analytics 4 (GA4),
Google Ads, and Google Tag Manager (GTM) through a single gtag implementation.

## Features

- **Unified Configuration**: Configure GA4, Google Ads, and GTM in a single
  destination
- **Shared Script Loading**: Efficient gtag script loading shared across all
  Google tools
- **Tool-Specific Mappings**: Individual mapping configurations for each Google
  tool
- **TypeScript Support**: Full type safety with strict typing
- **Flexible Usage**: Use one, two, or all three Google tools as needed

## Installation

```bash
npm install @walkeros/web-destination-gtag
```

## Basic Usage

### Single Tool (GA4 Only)

```typescript
import { destinationGtag } from '@walkeros/web-destination-gtag';

const destination = destinationGtag({
  settings: {
    ga4: {
      measurementId: 'G-XXXXXXXXXX',
    },
  },
});
```

### Multiple Tools

```typescript
import { destinationGtag } from '@walkeros/web-destination-gtag';

const destination = destinationGtag({
  settings: {
    ga4: {
      measurementId: 'G-XXXXXXXXXX',
      debug: true,
      pageview: false,
    },
    ads: {
      conversionId: 'AW-XXXXXXXXX',
      currency: 'EUR',
    },
    gtm: {
      containerId: 'GTM-XXXXXXX',
    },
  },
});
```

### With Collector

```typescript
import { collector } from '@walkeros/collector';
import { destinationGtag } from '@walkeros/web-destination-gtag';

const instance = collector({
  destinations: [
    destinationGtag({
      settings: {
        ga4: { measurementId: 'G-XXXXXXXXXX' },
        ads: { conversionId: 'AW-XXXXXXXXX' },
        gtm: { containerId: 'GTM-XXXXXXX' },
      },
    }),
  ],
});
```

## Configuration

### GA4 Settings

```typescript
interface GA4Settings {
  measurementId: string; // Required: GA4 Measurement ID
  debug?: boolean; // Enable debug mode
  include?: Include; // Data groups to include
  pageview?: boolean; // Send automatic pageviews (default: true)
  server_container_url?: string; // Server-side GTM URL
  snakeCase?: boolean; // Convert event names to snake_case (default: true)
  transport_url?: string; // Custom transport URL
}
```

### Google Ads Settings

```typescript
interface AdsSettings {
  conversionId: string; // Required: Google Ads Conversion ID
  currency?: string; // Default currency (default: 'EUR')
}
```

### GTM Settings

```typescript
interface GTMSettings {
  containerId: string; // Required: GTM Container ID
  dataLayer?: string; // Custom dataLayer name (default: 'dataLayer')
  domain?: string; // Custom GTM domain
}
```

## Mapping

Each tool supports individual mapping configurations:

```typescript
const mapping = {
  order: {
    complete: {
      name: 'purchase',
      settings: {
        ga4: {
          include: ['data', 'context'],
        },
        ads: {
          conversionId: 'abcxyz',
        },
        gtm: {}, // Uses 'purchase' as event name
      },
      data: {
        map: {
          transaction_id: 'data.id',
          value: 'data.total',
          currency: 'data.currency',
        },
      },
    },
  },
};
```

### GA4-Specific Mapping

```typescript
settings: {
  ga4: {
    include: ['data', 'context', 'user'], // Data groups to include
  }
}
```

### Google Ads Conversion Mapping

For Google Ads, specify the conversion label in the `settings.ads.label` field:

```typescript
{
  name: 'purchase', // GA4/GTM event name
  settings: {
    ads: {
      label: 'CONVERSION_LABEL', // This becomes AW-XXXXXXXXX/CONVERSION_LABEL
    },
  }
}
```

### GTM DataLayer Mapping

GTM receives the full event data and pushes to the configured dataLayer:

```typescript
settings: {
  gtm: {}, // Uses default dataLayer behavior
}
```

## Examples

### E-commerce Purchase

```typescript
import { destinationGtag } from '@walkeros/web-destination-gtag';

const destination = destinationGtag({
  settings: {
    ga4: { measurementId: 'G-XXXXXXXXXX' },
    ads: { conversionId: 'AW-XXXXXXXXX' },
  },
  mapping: {
    order: {
      complete: {
        name: 'purchase',
        settings: {
          ga4: { include: ['data'] },
          ads: {
            label: 'PURCHASE_LABEL', // Specify conversion label
          },
        },
        data: {
          map: {
            transaction_id: 'data.id',
            value: 'data.total',
            currency: 'data.currency',
            items: {
              loop: [
                'nested',
                {
                  condition: (entity) => entity.type === 'product',
                  map: {
                    item_id: 'data.id',
                    item_name: 'data.name',
                    quantity: 'data.quantity',
                  },
                },
              ],
            },
          },
        },
      },
    },
  },
});
```

### Custom Event with All Tools

```typescript
const customEventMapping = {
  product: {
    view: {
      name: 'view_item',
      settings: {
        ga4: { include: ['data', 'context'] },
        ads: {}, // No conversion tracking for product views
        gtm: {}, // Send to GTM dataLayer
      },
      data: {
        map: {
          item_id: 'data.id',
          item_name: 'data.name',
          item_category: 'data.category',
          value: 'data.price',
          currency: 'data.currency',
        },
      },
    },
  },
};
```

## TypeScript

Full TypeScript support with strict typing:

```typescript
import type { DestinationGtag } from '@walkeros/web-destination-gtag';

// Type-safe configuration
const config: DestinationGtag.Config = {
  settings: {
    ga4: {
      measurementId: 'G-XXXXXXXXXX',
      debug: true,
    },
  },
};

// Type-safe mapping rules
const rules: DestinationGtag.Rules = {
  order: {
    complete: {
      name: 'purchase',
      settings: {
        ga4: { include: ['data'] },
      },
      data: {
        map: {
          transaction_id: 'data.id',
          value: 'data.total',
        },
      },
    },
  },
};
```

## Best Practices

1. **Use Combined Configuration**: When using multiple Google tools, configure
   them in a single destination for better performance and maintenance.

2. **Tool-Specific Mappings**: Use tool-specific mapping settings to customize
   behavior for each Google product.

3. **Conversion Labels**: For Google Ads, use descriptive conversion labels in
   the mapping `name` field.

4. **Data Inclusion**: Use GA4's `include` setting to control which data groups
   are sent to minimize payload size.

5. **Debug Mode**: Enable GA4 debug mode during development to verify event
   tracking.

## Troubleshooting

**Events not appearing in GA4:**

- Verify the measurement ID is correct
- Check that events are being triggered
- Enable debug mode to see events in GA4 DebugView

**Google Ads conversions not tracking:**

- Ensure conversion ID and labels are correctly configured
- Verify the `settings.ads.label` field contains the correct conversion label
- Check that the conversion action is set up in Google Ads

**GTM events not appearing:**

- Verify the container ID is correct
- Check the dataLayer name matches your GTM configuration
- Use GTM Preview mode to debug event flow

## License

MIT
