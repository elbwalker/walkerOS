# @walkeros/server-destination-datamanager

Google Data Manager server destination for walkerOS - send conversion events and
audience data to Google Ads, Display & Video 360, and Google Analytics 4 through
a single unified API.

## Features

- **Multi-platform reach**: Single API call sends data to Google Ads, DV360, and
  GA4
- **Privacy-first**: SHA-256 hashing of PII with Gmail-specific email
  normalization
- **DMA compliance**: Built-in consent management for EEA/UK/Switzerland
- **Explicit mapping**: Transform walkerOS events to Data Manager format using
  declarative mapping rules
- **Type-safe**: Full TypeScript support with comprehensive type definitions

## Installation

```bash
npm install @walkeros/server-destination-datamanager
```

## Quick Start

### Minimal Configuration

```typescript
import { destinationDataManager } from '@walkeros/server-destination-datamanager';
import { startFlow } from '@walkeros/collector';

const { collector, elb } = await startFlow({
  destinations: {
    datamanager: {
      ...destinationDataManager,
      config: {
        settings: {
          // OAuth 2.0 access token with datamanager scope
          accessToken: 'ya29.c.xxx',

          // Destination accounts
          destinations: [
            {
              operatingAccount: {
                accountId: '123-456-7890',
                accountType: 'GOOGLE_ADS',
              },
              productDestinationId: 'AW-CONVERSION-123',
            },
          ],
        },
      },
    },
  },
});

// Track a conversion
await elb('order complete', {
  id: 'ORDER-123',
  total: 99.99,
  currency: 'USD',
});
```

### Complete Configuration

```typescript
import { destinationDataManager } from '@walkeros/server-destination-datamanager';

const config = {
  ...destinationDataManager,
  config: {
    settings: {
      accessToken: 'ya29.c.xxx',

      // Multiple destinations (max 10)
      destinations: [
        {
          operatingAccount: {
            accountId: '123-456-7890',
            accountType: 'GOOGLE_ADS',
          },
          productDestinationId: 'AW-CONVERSION-123',
        },
        {
          operatingAccount: {
            accountId: '987654321',
            accountType: 'GOOGLE_ANALYTICS_PROPERTY',
          },
          productDestinationId: 'G-XXXXXXXXXX',
        },
      ],

      // Optional settings
      eventSource: 'WEB', // Default event source
      batchSize: 100, // Events per batch (max 2000)
      batchInterval: 5000, // Batch flush interval in ms
      validateOnly: false, // Test mode (validate without ingestion)
      testEventCode: 'TEST12345', // For debugging

      // Request-level consent
      consent: {
        adUserData: 'CONSENT_GRANTED',
        adPersonalization: 'CONSENT_GRANTED',
      },

      // Guided helpers (apply to all events)
      userData: {
        email: 'user.id',
        phone: 'data.phone',
      },
      userId: 'user.id',
      clientId: 'user.device',
      sessionAttributes: 'context.sessionAttributes',
    },

    // Event mapping
    mapping: {
      order: {
        complete: {
          name: 'purchase',
          data: {
            map: {
              transactionId: 'data.id',
              conversionValue: 'data.total',
              currency: { key: 'data.currency', value: 'USD' },
              eventName: { value: 'purchase' }, // For GA4
            },
          },
        },
      },
    },
  },
};
```

## Authentication

### OAuth 2.0 Setup

1. **Create a Google Cloud Project**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing

2. **Enable Data Manager API**
   - Navigate to APIs & Services > Library
   - Search for "Google Data Manager API"
   - Click Enable

3. **Create Service Account**
   - Go to APIs & Services > Credentials
   - Click "Create Credentials" > "Service Account"
   - Grant necessary permissions
   - Download JSON key file

4. **Get Access Token**
   ```bash
   gcloud auth application-default print-access-token --scopes=https://www.googleapis.com/auth/datamanager
   ```

### Required Scope

```
https://www.googleapis.com/auth/datamanager
```

## Guided Mapping Helpers

Define common fields once in Settings instead of repeating them in every event
mapping:

```typescript
{
  settings: {
    accessToken: 'ya29.c.xxx',
    destinations: [...],

    // Guided helpers (apply to all events)
    userData: {
      email: 'user.id',
      phone: 'data.phone',
      firstName: 'data.firstName',
      lastName: 'data.lastName',
    },
    userId: 'user.id',
    clientId: 'user.device',
    sessionAttributes: 'context.sessionAttributes',

    // Consent mapping (string = field name, boolean = static value)
    consentAdUserData: 'marketing',              // Read event.consent.marketing
    consentAdPersonalization: 'personalization', // Read event.consent.personalization
    // OR use static values:
    // consentAdUserData: true,                  // Always CONSENT_GRANTED
  },
}
```

**Precedence**: Settings helpers < config.data < event mapping

Event mappings always override Settings:

```typescript
{
  settings: {
    userId: 'user.id',  // Default for all events
  },
  mapping: {
    order: {
      complete: {
        data: {
          map: {
            userId: 'data.customerId',  // Override for this event
          },
        },
      },
    },
  },
}
```

## Data Mapping

### Event Data Mapping

All event data must be explicitly mapped. The destination does not auto-extract
fields from events.

```typescript
{
  mapping: {
    order: {
      complete: {
        name: 'purchase',
        data: {
          map: {
            // Transaction data
            transactionId: 'data.id',
            conversionValue: 'data.total',
            currency: { key: 'data.currency', value: 'USD' },
            eventName: { value: 'purchase' },

            // User identification
            userId: 'user.id',
            email: 'user.id', // Will be SHA-256 hashed
            phone: 'data.phone', // Will be SHA-256 hashed

            // Attribution identifiers
            gclid: 'context.gclid',
            gbraid: 'context.gbraid',
          },
        },
      },
    },
  },
}
```

### Attribution Identifiers

Attribution identifiers must be explicitly mapped:

```typescript
{
  mapping: {
    order: {
      complete: {
        data: {
          map: {
            gclid: 'context.gclid', // From URL: ?gclid=TeSter
            gbraid: 'context.gbraid', // iOS attribution
            wbraid: 'context.wbraid', // Web-to-app
          },
        },
      },
    },
  },
}
```

### Consent Mapping

Map your consent field names to Data Manager's required fields:

```typescript
{
  settings: {
    // Map from your consent field names
    consentAdUserData: 'marketing',              // Read event.consent.marketing
    consentAdPersonalization: 'personalization', // Read event.consent.personalization
  },
}

// Your event with standard consent field names
await elb('order complete', { total: 99.99 }, {
  consent: {
    marketing: true,
    personalization: false,
  },
});

// Becomes Data Manager format
{
  consent: {
    adUserData: 'CONSENT_GRANTED',
    adPersonalization: 'CONSENT_DENIED'
  }
}
```

**Static values** for always-on consent:

```typescript
{
  settings: {
    consentAdUserData: true,  // Always CONSENT_GRANTED
    consentAdPersonalization: false,  // Always CONSENT_DENIED
  },
}
```

**Fallback**: Without consent mapping, uses `event.consent.marketing` →
`adUserData` and `event.consent.personalization` → `adPersonalization`.

## Event Mapping Examples

### E-commerce Purchase

```typescript
{
  mapping: {
    order: {
      complete: {
        name: 'purchase',
        data: {
          map: {
            transactionId: 'data.id',
            conversionValue: 'data.total',
            currency: { key: 'data.currency', value: 'USD' },
            eventName: { value: 'purchase' },

            // Map nested products to cart items
            cartData: {
              map: {
                items: {
                  loop: [
                    'nested',
                    {
                      condition: (entity) => entity.entity === 'product',
                      map: {
                        merchantProductId: 'data.id',
                        price: 'data.price',
                        quantity: { key: 'data.quantity', value: 1 },
                      },
                    },
                  ],
                },
              },
            },
          },
        },
      },
    },
  },
}
```

### Lead Generation

```typescript
{
  mapping: {
    lead: {
      submit: {
        name: 'generate_lead',
        data: {
          map: {
            eventName: { value: 'generate_lead' },
            conversionValue: { value: 10 },
            currency: { value: 'USD' },
          },
        },
      },
    },
  },
}
```

### Page View (GA4)

```typescript
{
  mapping: {
    page: {
      view: {
        name: 'page_view',
        data: {
          map: {
            eventName: { value: 'page_view' },
          },
        },
      },
    },
  },
}
```

## Account Types

### Google Ads

```typescript
{
  operatingAccount: {
    accountId: '123-456-7890', // Format: XXX-XXX-XXXX
    accountType: 'GOOGLE_ADS',
  },
  productDestinationId: 'AW-CONVERSION-123', // Conversion action ID
}
```

### Display & Video 360

```typescript
{
  operatingAccount: {
    accountId: '12345', // Advertiser ID
    accountType: 'DISPLAY_VIDEO_ADVERTISER',
  },
  productDestinationId: 'FL-ACTIVITY-123', // Floodlight activity ID
}
```

### Google Analytics 4

```typescript
{
  operatingAccount: {
    accountId: '123456789', // Property ID
    accountType: 'GOOGLE_ANALYTICS_PROPERTY',
  },
  productDestinationId: 'G-XXXXXXXXXX', // Measurement ID
}
```

## Data Formatting

### Email Normalization

- Trim whitespace
- Convert to lowercase
- Remove dots (.) for gmail.com/googlemail.com
- SHA-256 hash

**Example:**

```
Input:  John.Doe@Gmail.com
Output: <SHA-256 hash of "johndoe@gmail.com">
```

### Phone Normalization

- Convert to E.164 format: `+[country][number]`
- Remove all non-digit characters except leading +
- SHA-256 hash

**Example:**

```
Input:  (800) 555-0100
Output: <SHA-256 hash of "+18005550100">
```

### Address Formatting

- **Names**: Lowercase, remove titles/suffixes, SHA-256 hash
- **Region Code**: ISO-3166-1 alpha-2, NOT hashed (e.g., "US")
- **Postal Code**: NOT hashed

## Consent Management (DMA)

### Required for EEA/UK/Switzerland

```typescript
// Event-level consent
await elb('order complete', {
  total: 99.99,
}, {
  consent: {
    marketing: true,
    personalization: false,
  },
});

// Request-level consent (applies to all events)
{
  settings: {
    consent: {
      adUserData: 'CONSENT_GRANTED',
      adPersonalization: 'CONSENT_GRANTED',
    },
  },
}
```

## Testing

### Validate Mode

Test requests without actually ingesting data:

```typescript
{
  settings: {
    validateOnly: true, // Validates structure without ingestion
    testEventCode: 'TEST12345', // For debugging
  },
}
```

### Test Event Code

Add test event code for debugging in production:

```typescript
{
  settings: {
    testEventCode: 'TEST12345',
  },
}
```

## Debug Mode

Enable debug logging to see API requests and responses:

```typescript
{
  settings: {
    logLevel: 'debug', // Shows all API calls and responses
  },
}
```

**Log levels**: `debug` (all), `info`, `warn`, `error`, `none` (default).

Debug mode logs:

- Event processing details
- API request payload and destination count
- API response status and request ID
- Validation errors with full context

## Deduplication with gtag

Prevent double-counting between client-side gtag and server-side Data Manager:

### Transaction ID Matching

Use the same transaction ID across both platforms:

```javascript
// Client-side gtag
gtag('event', 'conversion', {
  transaction_id: 'ORDER-123',
  send_to: 'AW-CONVERSION/xxx',
});
```

```typescript
// Server-side walkerOS
await elb('order complete', {
  id: 'ORDER-123', // Must map to transactionId via mapping config
});
```

Google deduplicates using `transactionId` within 14 days. You must explicitly
map the transaction ID in your configuration.

### GCLID Attribution

Map GCLID from your event structure:

```typescript
{
  mapping: {
    order: {
      complete: {
        data: {
          map: {
            gclid: 'context.gclid',  // From URL parameter
            transactionId: 'data.id',
          },
        },
      },
    },
  },
}
```

GCLID is captured by walkerOS browser source from URL parameters (`?gclid=xxx`)
and stored in `context.gclid`.

## Rate Limits

- **300 requests per minute** per project
- **100,000 requests per day** per project
- Error code: `RESOURCE_EXHAUSTED` (HTTP 429)

## Conversion Window

**CRITICAL**: Events must occur within the last **14 days**. Older events will
be rejected.

## API Reference

### Settings

| Property                   | Type           | Required | Description                                 |
| -------------------------- | -------------- | -------- | ------------------------------------------- |
| `accessToken`              | string         | ✓        | OAuth 2.0 access token                      |
| `destinations`             | Destination[]  | ✓        | Array of destination accounts (max 10)      |
| `eventSource`              | EventSource    |          | Default event source (WEB, APP, etc.)       |
| `batchSize`                | number         |          | Max events per batch (max 2000)             |
| `batchInterval`            | number         |          | Batch flush interval in ms                  |
| `validateOnly`             | boolean        |          | Validate without ingestion                  |
| `url`                      | string         |          | Override API endpoint                       |
| `consent`                  | Consent        |          | Request-level consent                       |
| `testEventCode`            | string         |          | Test event code for debugging               |
| `userData`                 | object         |          | Guided helper: User data mapping            |
| `userId`                   | string         |          | Guided helper: First-party user ID          |
| `clientId`                 | string         |          | Guided helper: GA4 client ID                |
| `sessionAttributes`        | string         |          | Guided helper: Privacy-safe attribution     |
| `consentAdUserData`        | string/boolean |          | Consent mapping: Field name or static value |
| `consentAdPersonalization` | string/boolean |          | Consent mapping: Field name or static value |

### Event Fields

| Field             | Type   | Max Length | Description                      |
| ----------------- | ------ | ---------- | -------------------------------- |
| `transactionId`   | string | 512        | Transaction ID for deduplication |
| `clientId`        | string | 255        | GA client ID                     |
| `userId`          | string | 256        | First-party user ID              |
| `conversionValue` | number |            | Conversion value                 |
| `currency`        | string | 3          | ISO 4217 currency code           |
| `eventName`       | string | 40         | Event name (required for GA4)    |
| `eventSource`     | string |            | WEB, APP, IN_STORE, PHONE, OTHER |

## Resources

- [Google Data Manager API Documentation](https://developers.google.com/data-manager/api)
- [Data Formatting Guidelines](https://developers.google.com/data-manager/api/devguides/concepts/formatting)
- [DMA Compliance](https://developers.google.com/data-manager/api/devguides/concepts/dma)
- [walkerOS Documentation](https://www.elbwalker.com/docs/)

## License

MIT

## Support

For issues and questions:

- [GitHub Issues](https://github.com/elbwalker/walkerOS/issues)
- [walkerOS Documentation](https://www.elbwalker.com/docs/)
- [Google Data Manager Support](https://developers.google.com/data-manager/api/support/contact)
