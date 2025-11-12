# @walkeros/server-destination-datamanager

Google Data Manager server destination for walkerOS - send conversion events and
audience data to Google Ads, Display & Video 360, and Google Analytics 4 through
a single unified API.

## Features

- **Multi-platform reach**: Single API call sends data to Google Ads, DV360, and
  GA4
- **Privacy-first**: Automatic SHA-256 hashing of PII with Gmail-specific email
  normalization
- **DMA compliance**: Built-in consent management for EEA/UK/Switzerland
- **GCLID attribution**: Automatic extraction and inclusion of Google Click IDs
- **Flexible mapping**: Transform walkerOS events to Data Manager format using
  mapping rules
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
      batchSize: 100, // Events before auto-send (max 2000)
      batchInterval: 5000, // Timeout in ms before auto-send
      validateOnly: false, // Test mode (validate without ingestion)
      testEventCode: 'TEST12345', // For debugging

      // Request-level consent
      consent: {
        adUserData: 'CONSENT_GRANTED',
        adPersonalization: 'CONSENT_GRANTED',
      },
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

## Data Mapping

### Automatic Data Extraction

The destination automatically extracts and formats:

- **User Identifiers**: Email, phone, address (with SHA-256 hashing)
- **Transaction Data**: ID, value, currency
- **Consent**: Maps walkerOS consent to DMA format

**Attribution identifiers** (gclid, gbraid, wbraid) must be configured via
mapping for explicit control.

### User Data Mapping

```typescript
// walkerOS event
{
  user: { id: 'user@example.com' },
  data: {
    phone: '+1234567890',
    firstName: 'John',
    lastName: 'Doe',
    country: 'US',
    zip: '12345',
  }
}

// Automatically becomes (with hashing):
{
  userData: {
    userIdentifiers: [
      { emailAddress: '<SHA-256 hash>' },
      { phoneNumber: '<SHA-256 hash>' },
      { address: {
          givenName: '<SHA-256 hash>',
          familyName: '<SHA-256 hash>',
          regionCode: 'US', // NOT hashed
          postalCode: '12345' // NOT hashed
        }
      }
    ]
  }
}
```

### Attribution Identifiers

```typescript
// Extract GCLID from URL parameters
{
  context: { gclid: 'TeSter' }, // From URL: ?gclid=TeSter

  // Automatically included in event
  adIdentifiers: {
    gclid: 'TeSter'
  }
}
```

### Consent Mapping

```typescript
// walkerOS consent
{
  consent: {
    marketing: true,
    personalization: false
  }
}

// Maps to Data Manager format
{
  consent: {
    adUserData: 'CONSENT_GRANTED',
    adPersonalization: 'CONSENT_DENIED'
  }
}
```

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
  id: 'ORDER-123', // Auto-mapped to transactionId
});
```

Google deduplicates using `transactionId` within 14 days.

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

GCLID is automatically captured by walkerOS browser source from URL parameters
(`?gclid=xxx`).

## Rate Limits

- **300 requests per minute** per project
- **100,000 requests per day** per project
- Error code: `RESOURCE_EXHAUSTED` (HTTP 429)

## Conversion Window

**CRITICAL**: Events must occur within the last **14 days**. Older events will
be rejected.

## API Reference

### Settings

| Property        | Type          | Required | Description                            |
| --------------- | ------------- | -------- | -------------------------------------- |
| `accessToken`   | string        | ✓        | OAuth 2.0 access token                 |
| `destinations`  | Destination[] | ✓        | Array of destination accounts (max 10) |
| `eventSource`   | EventSource   |          | Default event source (WEB, APP, etc.)  |
| `batchSize`     | number        |          | Max events before auto-send (max 2000) |
| `batchInterval` | number        |          | Timeout in ms before auto-send         |
| `validateOnly`  | boolean       |          | Validate without ingestion             |
| `url`           | string        |          | Override API endpoint                  |
| `consent`       | Consent       |          | Request-level consent                  |
| `testEventCode` | string        |          | Test event code for debugging          |

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
