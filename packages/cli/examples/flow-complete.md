# flow-complete.json - Comprehensive walkerOS Flow Example

This example demonstrates **ALL JSON-compatible walkerOS features** with
real-world patterns. It contains two named flows (`web` and `server`) showing a
complete event tracking architecture.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ WEB FLOW                                                                    │
│                                                                             │
│   Browser Source ─┐                                                         │
│   DataLayer Source ──▶ [Validator] ──▶ Collector ──▶ GA4 Destination        │
│   Demo Source ────┘                               └──▶ API Destination      │
│                                                              │              │
└──────────────────────────────────────────────────────────────│──────────────┘
                                                               ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ SERVER FLOW                                                                 │
│                                                                             │
│   HTTP Request ──▶ Express Source ──▶ Collector ──▶ [Fingerprint] ──────┐   │
│                         │                          [Validator]          │   │
│                         │                                               ▼   │
│                         └── ingest: IP, user-agent ────────▶ Meta Destination
│                                     language, referer       Demo Destination│
└─────────────────────────────────────────────────────────────────────────────┘
```

## Quick Start

### Run Web Flow

```bash
cd walkerOS
npx walkeros serve packages/cli/examples/flow-complete.json --flow web
# Open http://localhost:3000 - demo events fire automatically
```

### Run Server Flow

```bash
cd walkerOS
npx walkeros run packages/cli/examples/flow-complete.json --flow server

# Test health
curl http://localhost:8080/health

# Send test event
curl -X POST http://localhost:8080/collect \
  -H "Content-Type: application/json" \
  -d '{
    "name": "order complete",
    "data": {"id": "ORD-999", "total": 99.99, "currency": "EUR"},
    "user": {"email": "test@example.com", "id": "U-123"},
    "nested": [{"entity": "product", "data": {"id": "P1", "name": "Item", "price": 99.99, "quantity": 1}}]
  }'
```

### Run Both (Full Pipeline)

```bash
# Terminal 1: Start server
npx walkeros run packages/cli/examples/flow-complete.json --flow server

# Terminal 2: Start web (sends to server via API destination)
npx walkeros serve packages/cli/examples/flow-complete.json --flow web
```

---

## Feature Inventory

### Features Used (51)

#### Mapping - Value Extraction

| Feature           | Location          | Example                                                      |
| ----------------- | ----------------- | ------------------------------------------------------------ |
| Key extraction    | GA4 page_view     | `"page_title": "data.title"`                                 |
| Static value      | Meta ViewContent  | `"content_type": { "value": "product" }`                     |
| Key with fallback | GA4 add_to_cart   | `{ "key": "data.currency", "value": "$variables.currency" }` |
| Nested key (deep) | dataLayer mapping | `"items.0.item_id"`                                          |

#### Mapping - Structure

| Feature               | Location           | Example                                                     |
| --------------------- | ------------------ | ----------------------------------------------------------- |
| Map (object)          | GA4 purchase       | `"data": { "map": { ... } }`                                |
| Loop with "nested"    | GA4 purchase items | `{ "loop": ["nested", { "map": {...} }] }`                  |
| Loop with "this"      | GA4 add_to_cart    | `{ "loop": ["this", { "map": {...} }] }`                    |
| Set (single value)    | Meta ViewContent   | `"content_ids": { "set": ["data.id"] }`                     |
| Set (multiple values) | Meta settings      | `"external_id": { "set": ["user.device", "user.session"] }` |
| Direct passthrough    | Meta PageView      | `"data": "data"`                                            |

#### Mapping - Control

| Feature              | Location            | Example                                                     |
| -------------------- | ------------------- | ----------------------------------------------------------- |
| Consent-gated field  | API destination     | `{ "key": "user.email", "consent": { "marketing": true } }` |
| Ignore rule          | GA4/API test events | `{ "ignore": true }`                                        |
| Wildcard action (\*) | GA4 test, Meta      | `"test": { "*": { "ignore": true } }`                       |
| Wildcard entity (\*) | Meta click handler  | `"*": { "click": { "name": "CustomEvent" } }`               |

#### Definitions & Variables

| Feature              | Location           | Example                                      |
| -------------------- | ------------------ | -------------------------------------------- |
| Root-level variables | Root               | `"currency": "EUR"`                          |
| Flow-level variables | server.variables   | `"metaPixelId": "${META_PIXEL_ID:...}"`      |
| Environment variable | Variables          | `"${GA4_MEASUREMENT_ID:G-DEMO123456}"`       |
| Env with default     | Variables          | `"${API_URL:http://localhost:8080/collect}"` |
| $variables reference | GA4 settings       | `"$variables.ga4MeasurementId"`              |
| Definition (complex) | Root definitions   | `"ga4ItemsLoop": { "loop": [...] }`          |
| $ref reference       | GA4 purchase items | `{ "$ref": "#/definitions/ga4ItemsLoop" }`   |

#### Sources

| Feature              | Location  | Example                               |
| -------------------- | --------- | ------------------------------------- |
| Primary source       | browser   | `"primary": true`                     |
| Multiple sources     | web flow  | browser + dataLayer + demo            |
| Source-level mapping | dataLayer | `"mapping": { "add_to_cart": {...} }` |
| Pre-collector chain  | dataLayer | `"next": "dataLayerValidator"`        |
| Demo source events   | demo      | Pre-configured test events            |

#### Transformers

| Feature                 | Location           | Example                            |
| ----------------------- | ------------------ | ---------------------------------- |
| Validator transformer   | dataLayerValidator | JSON Schema validation             |
| Fingerprint transformer | server             | Hash context fields to `user.hash` |
| Transformer chaining    | server             | `"next": "serverValidator"`        |
| Post-collector chain    | Meta               | `"before": "fingerprint"`          |
| Contract validation     | serverValidator    | Entity/action schemas              |
| Format option           | serverValidator    | `"format": true`                   |

#### Destinations

| Feature               | Location         | Example                            |
| --------------------- | ---------------- | ---------------------------------- |
| Destination consent   | GA4              | `"consent": { "marketing": true }` |
| Destination mapping   | All destinations | Entity/action to vendor events     |
| Multiple destinations | Both flows       | GA4 + API, Meta + Demo             |
| Batch option          | API              | `"batch": 5`                       |

#### Collector

| Feature           | Location        | Example                                 |
| ----------------- | --------------- | --------------------------------------- |
| Tagging           | Both collectors | `"tagging": 1`                          |
| Consent defaults  | Both collectors | `"consent": { "functional": true }`     |
| Globals           | Both collectors | `"environment": "demo"`                 |
| Custom properties | web collector   | `"custom": { "campaign": "flow-demo" }` |
| User defaults     | web collector   | `"user": { "id": "anonymous" }`         |

#### Server-Specific

| Feature              | Location    | Example                                         |
| -------------------- | ----------- | ----------------------------------------------- |
| Ingest metadata      | http source | `"context.ip": "ip"`                            |
| Language header      | ingest      | `"context.language": "headers.accept-language"` |
| Policy               | Meta        | Pre-processing field transformation             |
| Policy consent-gated | Meta        | `"user_data.em"` with consent                   |
| Policy nested map    | Meta        | `"custom_data.request_meta": { "map": {...} }`  |

#### Browser Source

| Feature         | Location | Example                            |
| --------------- | -------- | ---------------------------------- |
| Prefix          | browser  | `"prefix": "data-elb"`             |
| Auto pageview   | browser  | `"pageview": true`                 |
| Session consent | browser  | `"session": { "consent": {...} }`  |
| ELB binding     | browser  | `"elb": "elb"`, `"elbLayer": true` |

---

### Features NOT Used (15)

#### Requires JavaScript (7)

These features cannot be used in pure JSON configurations:

| Feature                     | Reason                        |
| --------------------------- | ----------------------------- |
| `fn:` function              | Requires JavaScript callback  |
| `condition:`                | Requires JavaScript predicate |
| Conditional mapping (array) | Requires condition functions  |
| Custom transformer code     | Requires JavaScript           |
| Custom source code          | Requires JavaScript           |
| Custom destination code     | Requires JavaScript           |
| Event handler callbacks     | Requires JavaScript           |

#### Omitted for Clarity (8)

These features could be added but were omitted to keep the example focused:

| Feature                   | Why Omitted                   |
| ------------------------- | ----------------------------- |
| Multiple named flows (3+) | Two flows sufficient for demo |
| Queue config              | Advanced batching scenario    |
| Retry config              | Advanced error handling       |
| Custom fetch options      | API destination advanced      |
| Dynamic routing           | Requires condition logic      |
| Transform before send     | Covered by policy             |
| Custom headers in API     | Would add complexity          |
| Multiple validators       | One per flow sufficient       |

---

## Data Flow Examples

### Order Complete (Server Flow)

1. **Ingest**: Request metadata extracted (IP, user-agent, referer) to
   `context.*`
2. **Policy**: Pre-processes event:
   - `user_data.em` from `user.email` (only if marketing consent)
   - `user_data.external_id` from `user.id`
   - `custom_data.server_processed` = `true`
   - `custom_data.request_meta` = `{ ip, ua }` from context
3. **Fingerprint**: Hashes context fields to `user.hash`
4. **Validator**: Checks products have `data.id`
5. **Mapping**: Transforms to Meta format:
   - `"name": "Purchase"`
   - `value`, `currency`, `order_id` extracted
   - `contents` via `$ref` to definition loop

### Product Add (Web Flow)

1. **DataLayer Source**: Captures `add_to_cart` event
2. **Source Mapping**: Transforms to `product add` with walkerOS structure
3. **Validator**: Checks `id` and `name` present
4. **Collector**: Adds globals, consent, user data
5. **GA4 Mapping**: Transforms to `add_to_cart` with items array
6. **API Destination**: Batches and sends to server (if batch size reached)

---

## Environment Variables

| Variable             | Default                         | Description                |
| -------------------- | ------------------------------- | -------------------------- |
| `GA4_MEASUREMENT_ID` | `G-DEMO123456`                  | Google Analytics 4 ID      |
| `API_URL`            | `http://localhost:8080/collect` | Server collection endpoint |
| `META_PIXEL_ID`      | `123456789012345`               | Meta Pixel ID              |
| `META_ACCESS_TOKEN`  | `demo_token`                    | Meta Conversions API token |
