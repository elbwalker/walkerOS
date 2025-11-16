# walkerOS Flow Examples

This directory contains example flow configurations demonstrating various
walkerOS use cases.

## Web Examples

### web-ecommerce.json

**Purpose**: Simple web demo with test events

**Features**:

- sourceDemo (generates test events automatically)
- destinationDemo (console output)
- Simulates page views and product views

**Use case**: Quick testing and understanding basic flow structure

**Try it**:

```bash
walkeros bundle -c examples/web-ecommerce.json --stats
walkeros simulate -c examples/web-ecommerce.json -e '{"name":"page view","data":{"title":"Home"}}'
```

### web-tracking.json

**Purpose**: Comprehensive browser tracking with multiple analytics platforms

**Features**:

- sourceBrowser (DOM event tracking)
- destinationAPI → localhost:8080/collect (send to collection server)
- destinationGtag → Google Analytics 4
- destinationMeta → Meta Pixel (Facebook)
- destinationDemo → Console logging

**Event mappings**:

- Page views → GA4 `page_view`, Meta `PageView`
- Product views → GA4 `view_item`, Meta `ViewContent`
- Add to cart → GA4 `add_to_cart`, Meta `AddToCart`
- Purchases → GA4 `purchase`, Meta `Purchase`

**Use case**: Production web tracking with multiple destinations

**Environment variables**:

- `GA4_MEASUREMENT_ID` - Google Analytics 4 measurement ID (default:
  G-XXXXXXXXXX)
- `META_PIXEL_ID` - Meta Pixel ID (default: 123456789)
- `META_TEST_CODE` - Meta test event code (optional)

**Try it**:

```bash
# Set environment variables
export GA4_MEASUREMENT_ID="G-YOUR-ID"
export META_PIXEL_ID="123456789"

# Bundle for browser
walkeros bundle -c examples/web-tracking.json --stats

# Simulate events
walkeros simulate -c examples/web-tracking.json \
  -e '{"name":"product view","data":{"id":"P123","name":"Laptop","price":999}}'
```

## Server Examples

### server-collection.json

**Purpose**: Server-side event collection and forwarding to data platforms

**Features**:

- sourceExpress (HTTP endpoint at /collect)
- destinationDataManager → Google Tag Manager Server-Side
- destinationDemo → Console logging

**Event mappings**:

- Page views → GTM `page_view`
- Product views → GTM `view_item`
- Add to cart → GTM `add_to_cart`
- Purchases → GTM `purchase`

**Use case**: Server-side tracking for privacy-compliant data collection

**Environment variables**:

- `GTM_CONTAINER_ID` - GTM Server Container ID (default: GTM-XXXXXXX)
- `GTM_SERVER_URL` - GTM Server URL (default: https://gtm.example.com)

**Try it**:

```bash
# Set environment variables
export GTM_CONTAINER_ID="GTM-XXXXX"
export GTM_SERVER_URL="https://your-gtm-server.com"

# Run in Docker
walkeros run collect examples/server-collection.json -p 8080

# Send test event (in another terminal)
curl -X POST http://localhost:8080/collect \
  -H "Content-Type: application/json" \
  -d '{
    "name": "product view",
    "data": {
      "id": "P123",
      "name": "Laptop",
      "price": 999
    },
    "user": {
      "id": "user_123",
      "session": "session_456"
    }
  }'
```

## Workflow: Web → Server

A common pattern is to collect events in the browser and send them to a server
for processing:

**1. Start collection server**:

```bash
walkeros run collect examples/server-collection.json -p 8080
```

**2. Bundle web tracking** (configured to send to localhost:8080):

```bash
walkeros bundle -c examples/web-tracking.json
```

**3. Deploy** `dist/web-tracking.js` to your website

**4. Events flow**:

```
Browser → destinationAPI (POST /collect) → sourceExpress → destinationDataManager → GTM Server
```

## Creating Custom Examples

### Flow Configuration Structure

```json
{
  "flow": {
    "platform": "web" | "server",
    "sources": {
      "<source_name>": {
        "code": "<imported_function_name>",
        "config": { "settings": { /* source config */ } }
      }
    },
    "destinations": {
      "<destination_name>": {
        "code": "<imported_function_name>",
        "config": {
          "settings": { /* destination config */ },
          "mapping": { /* event mappings */ }
        }
      }
    },
    "collector": {
      "run": true,
      "globals": { /* global properties */ }
    }
  },
  "build": {
    "packages": {
      "<package_name>": {
        "version": "latest",
        "imports": ["<function_name>"]
      }
    },
    "code": "// Optional custom code\n",
    "template": "templates/base.hbs",
    "output": "./dist/bundle.js"
  }
}
```

### Available Sources

**Web**:

- `@walkeros/web-source-browser` → `sourceBrowser` (DOM tracking)
- `@walkeros/web-source-datalayer` → `sourceDataLayer` (data layer integration)
- `@walkeros/source-demo` → `sourceDemo` (test events)

**Server**:

- `@walkeros/server-source-express` → `sourceExpress` (HTTP endpoint)
- `@walkeros/server-source-gcp` → `sourceGCP` (Google Cloud Functions)

### Available Destinations

**Web**:

- `@walkeros/web-destination-api` → `destinationAPI` (HTTP API)
- `@walkeros/web-destination-gtag` → `destinationGtag` (GA4, GTM, Ads)
- `@walkeros/web-destination-meta` → `destinationMeta` (Meta Pixel)
- `@walkeros/web-destination-piwikpro` → `destinationPiwikPro`
- `@walkeros/web-destination-plausible` → `destinationPlausible`

**Server**:

- `@walkeros/server-destination-datamanager` → `destinationDataManager` (GTM
  Server-Side)
- `@walkeros/server-destination-meta` → `destinationMeta` (Meta CAPI)
- `@walkeros/server-destination-aws` → `destinationAWS`
- `@walkeros/server-destination-gcp` → `destinationGCP`

**Universal**:

- `@walkeros/destination-demo` → `destinationDemo` (console logging)

## Event Naming Convention

**CRITICAL**: Events must follow the "ENTITY ACTION" format with space
separation:

✅ Correct:

- `"page view"`
- `"product add"`
- `"order complete"`
- `"button click"`

❌ Wrong:

- `"page_view"` (underscore)
- `"purchase"` (missing entity)
- `"add_to_cart"` (underscore)

The event name is parsed as: `const [entity, action] = event.split(' ')`

## Next Steps

1. Try each example with `walkeros bundle` and `walkeros simulate`
2. Modify examples to match your tracking requirements
3. Create custom flow files for your use case
4. Deploy to production (see [PUBLISHING.md](../docs/PUBLISHING.md))
