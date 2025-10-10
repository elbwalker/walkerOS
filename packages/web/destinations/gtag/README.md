# Google Gtag Destination for walkerOS

[Source Code](https://github.com/elbwalker/walkerOS/tree/main/packages/web/destinations/gtag)
&bull;
[NPM Package](https://www.npmjs.com/package/@walkeros/web-destination-gtag)

The Google Gtag destination provides a unified interface for sending events to
Google Analytics 4 (GA4), Google Ads, and Google Tag Manager (GTM) through a
single destination configuration.

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

## Usage

```typescript
import { startFlow } from '@walkeros/collector';
import { destinationGtag } from '@walkeros/web-destination-gtag';

const { elb } = await startFlow();

elb('walker destination', destinationGtag, {
  settings: {
    ga4: {
      measurementId: 'G-XXXXXXXXXX', // Required for GA4
    },
    ads: {
      conversionId: 'AW-XXXXXXXXX', // Required for Google Ads
    },
    gtm: {
      containerId: 'GTM-XXXXXXX', // Required for GTM
    },
  },
});
```

## Configuration

| Name  | Type          | Description                                        | Required | Example                             |
| ----- | ------------- | -------------------------------------------------- | -------- | ----------------------------------- |
| `ga4` | `GA4Settings` | GA4-specific configuration settings                | No       | `{ measurementId: 'G-XXXXXXXXXX' }` |
| `ads` | `AdsSettings` | Google Ads specific configuration settings         | No       | `{ conversionId: 'AW-XXXXXXXXX' }`  |
| `gtm` | `GTMSettings` | Google Tag Manager specific configuration settings | No       | `{ containerId: 'GTM-XXXXXXX' }`    |

### Event Mapping

For custom event mapping (`mapping.entity.action.settings`):

| Name  | Type         | Description                                     | Required | Example                            |
| ----- | ------------ | ----------------------------------------------- | -------- | ---------------------------------- |
| `ga4` | `GA4Mapping` | GA4-specific event mapping configuration        | No       | `{ include: ['data', 'context'] }` |
| `ads` | `AdsMapping` | Google Ads specific event mapping configuration | No       | `{ label: 'conversion_label' }`    |
| `gtm` | `GTMMapping` | GTM specific event mapping configuration        | No       | `{}`                               |

## Consent Mode

The gtag destination automatically handles Google Consent Mode v2 with a "deny
by default" approach. Configure consent mode using the `como` setting:

```typescript
import { destinationGtag } from '@walkeros/web-destination-gtag';

const destination = destinationGtag({
  settings: {
    como: true, // Enable with default mapping
    ga4: { measurementId: 'G-XXXXXXXXXX' },
  },
});
```

### Configuration Options

| Value    | Description          | Default Mapping                                                                                        |
| -------- | -------------------- | ------------------------------------------------------------------------------------------------------ |
| `false`  | Disable consent mode | -                                                                                                      |
| `true`   | Use default mapping  | `marketing` → `ad_storage`, `ad_user_data`, `ad_personalization`<br>`functional` → `analytics_storage` |
| `object` | Custom mapping       | `{ [walkerOSGroup]: gtagParameter \| gtagParameter[] }`                                                |

### Custom Mapping

```typescript
const destination = destinationGtag({
  settings: {
    como: {
      marketing: ['ad_storage', 'ad_personalization'],
      analytics: 'analytics_storage',
    },
    ga4: { measurementId: 'G-XXXXXXXXXX' },
  },
});
```

### Usage

Consent mode automatically activates when you send consent events through
walkerOS:

```typescript
// Grant consent
elb('walker consent', { marketing: true, functional: true });

// Deny consent
elb('walker consent', { marketing: false, functional: false });
```

The destination handles all gtag consent calls automatically, ensuring
compliance with privacy regulations.

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
                  condition: (entity) => entity.entity === 'product',
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

## Contribute

Feel free to contribute by submitting an
[issue](https://github.com/elbwalker/walkerOS/issues), starting a
[discussion](https://github.com/elbwalker/walkerOS/discussions), or getting in
[contact](https://calendly.com/elb-alexander/30min).

## License

MIT
