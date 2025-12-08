# walkerOS Flow Examples

This directory contains example flow configurations demonstrating various
walkerOS use cases.

## Rebuilding Example Bundles

The `.mjs` bundle files in this directory are pre-built from their corresponding
`.json` config files. If you update the configs or core packages, rebuild them:

```bash
cd /workspaces/walkerOS/packages/cli

# Rebuild server-collect
walkeros bundle examples/server-collect.json --local
mv server-collect.mjs examples/

# Rebuild web-serve
walkeros bundle examples/web-serve.json --local
mv web-serve.js examples/

# Update Docker demos
cp examples/server-collect.mjs ../docker/demos/demo-collect.mjs
cp examples/web-serve.js ../docker/demos/demo-serve.mjs
```

**Important**: Always use `--local` flag when rebuilding examples in the
devcontainer.

## Web Examples

### web-serve.json

**Purpose**: Browser bundle that sends events to collector

**Features**:

- sourceDemo (generates test events automatically)
- destinationDemo (console output for debugging)
- destinationAPI (sends events to http://localhost:8080/collect)
- Simulates page views and product views

**Use case**: Demo web tracking that connects to server-collect.json for full
event flow testing

**Try it**:

```bash
walkeros bundle examples/web-serve.json
walkeros run serve examples/web-serve.js -p 3000
# Open http://localhost:3000 in browser
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
walkeros bundle examples/web-tracking.json --stats

# Simulate events
walkeros simulate examples/web-tracking.json \
  --event '{"name":"product view","data":{"id":"P123","name":"Laptop","price":999}}'
```

## Server Examples

### server-collect.json

**Purpose**: Minimal server-side event collection endpoint

**Features**:

- sourceExpress (HTTP endpoint at /collect)
- destinationDemo (console logging)
- CORS enabled for browser requests
- Health check endpoint

**Use case**: Simple event collector for demo and testing, receives events from
web-serve.json

**Try it**:

```bash
walkeros bundle examples/server-collect.json
walkeros run collect examples/server-collect.mjs -p 8080

# In another terminal, send test event:
curl -X POST http://localhost:8080/collect \
  -H "Content-Type: application/json" \
  -d '{"name":"page view","data":{"title":"Test"}}'
```

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

### Quick Demo Loop (web-serve → server-collect)

The simplest way to see the complete event flow:

**Terminal 1 - Start collector**:

```bash
walkeros bundle examples/server-collect.json
walkeros run collect examples/server-collect.mjs -p 8080
```

**Terminal 2 - Start web server**:

```bash
walkeros bundle examples/web-serve.json
walkeros run serve examples/web-serve.js -p 3000
```

**Browser**: Open http://localhost:3000

**Events flow**:

```
Browser (demo source) → destinationAPI → POST /collect → sourceExpress → destinationDemo (console)
```

### Production Pattern (web-tracking → server-collection)

For production with real analytics platforms:

**1. Start collection server**:

```bash
walkeros run collect examples/server-collection.json -p 8080
```

**2. Bundle web tracking** (configured to send to localhost:8080):

```bash
walkeros bundle examples/web-tracking.json
```

**3. Deploy** bundle to your website

**4. Events flow**:

```
Browser → destinationAPI (POST /collect) → sourceExpress → destinationDataManager → GTM Server
```

## Creating Custom Examples

### Flow Configuration Structure

Flow configs use the `Flow.Setup` format:

```json
{
  "version": 1,
  "flows": {
    "default": {
      "web": {},
      "packages": {
        "<package_name>": { "imports": ["<function_name>"] }
      },
      "sources": {
        "<source_name>": {
          "code": "<imported_function_name>",
          "config": {
            "settings": {
              /* source config */
            }
          }
        }
      },
      "destinations": {
        "<destination_name>": {
          "code": "<imported_function_name>",
          "config": {
            "settings": {
              /* destination config */
            },
            "mapping": {
              /* event mappings */
            }
          }
        }
      },
      "collector": {
        "run": true,
        "globals": {
          /* global properties */
        }
      }
    }
  }
}
```

**Key points:**

- Platform via `web: {}` or `server: {}` key (not `platform: "web"`)
- Output path is convention-based: `./dist/walker.js` (web) or
  `./dist/bundle.mjs` (server)

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
4. Deploy to production
