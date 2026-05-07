# @walkeros/server-source-gcp

Google Cloud Platform server sources for walkerOS, lightweight runtime adapters
for GCP services. Ships two surfaces: the Cloud Functions HTTP handler and
Pub/Sub (pull subscriber and push webhook).

## Installation

```bash
npm install @walkeros/server-source-gcp @google-cloud/functions-framework
```

## Usage

```typescript
import {
  sourceCloudFunction,
  type SourceCloudFunction,
} from '@walkeros/server-source-gcp';
import { startFlow } from '@walkeros/collector';
import { http } from '@google-cloud/functions-framework';

const { elb } = await startFlow<SourceCloudFunction.Push>({
  sources: { api: { code: sourceCloudFunction } },
});

http('walkerHandler', elb);
```

---

## Cloud Functions Source

The Cloud Functions source provides an HTTP handler that receives walker events
and forwards them to the walkerOS collector.

### Basic Usage

```typescript
import {
  sourceCloudFunction,
  type SourceCloudFunction,
} from '@walkeros/server-source-gcp';
import { startFlow } from '@walkeros/collector';
import { http } from '@google-cloud/functions-framework';

// Handler singleton - reused across warm invocations
let handler: SourceCloudFunction.Push;

async function setup() {
  if (handler) return handler;

  const { elb } = await startFlow<SourceCloudFunction.Push>({
    sources: {
      api: {
        code: sourceCloudFunction,
        config: {
          settings: { cors: true },
        },
      },
    },
    destinations: {
      // Your destinations
    },
  });

  handler = elb;
  return handler;
}

// Register with Cloud Functions framework
setup().then((h) => http('walkerHandler', h));
```

## Bundler Integration

Use with minimal config:

```json
{
  "sources": {
    "api": { "type": "cloudfunction", "cors": true }
  }
}
```

Bundler auto-generates deployable exports.

### Configuration Options

```typescript
interface Settings {
  cors?: boolean | CorsOptions; // Enable CORS (default: true)
  batch?: boolean; // Enable batch processing (default: true)
  maxBatchSize?: number; // Max events per batch (default: 100)
  timeout?: number; // Request timeout (default: 30000ms)
}

interface CorsOptions {
  origin?: string | string[]; // Allowed origins
  methods?: string[]; // Allowed methods
  headers?: string[]; // Allowed headers
  credentials?: boolean; // Allow credentials
  maxAge?: number; // Preflight cache time
}
```

### Ingest Metadata

Extract request metadata and forward it to processors and destinations:

```typescript
await startFlow({
  sources: {
    api: {
      code: sourceCloudFunction,
      config: {
        settings: { cors: true },
        ingest: {
          ip: 'ip',
          ua: 'headers.user-agent',
          origin: 'headers.origin',
        },
      },
    },
  },
});
```

**Available ingest paths:**

| Path        | Description                       |
| ----------- | --------------------------------- |
| `ip`        | Client IP address                 |
| `headers.*` | HTTP headers (user-agent, origin) |
| `method`    | HTTP method                       |
| `hostname`  | Request hostname                  |

### Request Format

**Single Event:**

```json
{
  "event": "page view",
  "data": {
    "title": "Home Page",
    "path": "/"
  },
  "context": {
    "stage": ["prod", 1]
  }
}
```

**Batch Events:**

```json
{
  "events": [
    {
      "event": "page view",
      "data": { "title": "Page 1" }
    },
    {
      "event": "button click",
      "data": { "id": "btn1" }
    }
  ]
}
```

### Response Format

**Success:**

```json
{
  "success": true,
  "id": "event-id-123"
}
```

**Batch Success:**

```json
{
  "success": true,
  "processed": 2,
  "errors": []
}
```

**Error:**

```json
{
  "success": false,
  "error": "Invalid event format"
}
```

### Deployment

The source is designed to work with the walkerOS deployment system:

```json
{
  "providers": [
    {
      "name": "api-endpoint",
      "type": "gcp-functions",
      "artifact": {
        "source": "bundler",
        "bundle": "api-collector"
      },
      "settings": {
        "functionName": "walker-collector",
        "runtime": "nodejs18",
        "memory": 256
      }
    }
  ]
}
```

### Testing

The source uses environment injection for testability:

```typescript
import { sourceCloudFunction } from '@walkeros/server-source-gcp';

const mockElb = jest.fn().mockResolvedValue({
  ok: true,
  event: { id: 'test-id' },
});

const source = await sourceCloudFunction(
  { settings: { cors: false } },
  { elb: mockElb },
);

// Test the handler
const mockReq = { method: 'POST', body: { event: 'test' } };
const mockRes = { status: jest.fn().mockReturnThis(), json: jest.fn() };

await source.push(mockReq, mockRes);

expect(mockElb).toHaveBeenCalledWith('test', {});
expect(mockRes.status).toHaveBeenCalledWith(200);
```

## Architecture

This source follows the walkerOS patterns:

- **Stateless**: No collector references, communicates via elb function
- **Environment Injection**: All dependencies provided through environment
- **Lean Implementation**: Minimal required fields, focused on HTTP handling
- **Standard Interface**: The `push` function IS the Cloud Function handler
- **Plug-and-Play**: Direct assignment: `http('handler', source.push)`

The source's `push` function accepts HTTP requests, transforms them into walker
events, and forwards them to the collector for processing by destinations.

---

## Pub/Sub source

Subscribes to a Google Cloud Pub/Sub topic and forwards each message to the
walkerOS collector. Ships in two delivery models:

- `sourcePubSubPull`: long-running streaming pull subscriber. Use in containers,
  VMs, or any process that stays alive. Highest throughput.
- `sourcePubSubPush`: HTTP push webhook handler. Use in serverless deployments
  (Cloud Run, Cloud Functions, Lambda) where there is no long-running process to
  keep a streaming subscriber alive.

### Installation

Pub/Sub support is part of `@walkeros/server-source-gcp`. The Pub/Sub SDK is
declared as a runtime dependency:

```bash
npm install @walkeros/server-source-gcp
```

### Quickstart, pull subscriber

```typescript
import { sourcePubSubPull } from '@walkeros/server-source-gcp';
import { startFlow } from '@walkeros/collector';

await startFlow({
  sources: {
    pubsub: {
      code: sourcePubSubPull,
      config: {
        settings: {
          projectId: 'my-gcp-project',
          subscription: 'events-sub',
          // Optional: tighten flow control beyond SDK defaults
          flowControl: { maxMessages: 100, maxBytes: 10 * 1024 * 1024 },
        },
      },
    },
  },
  destinations: {
    // Your destinations
  },
});
```

The pull source is event-driven: `init()` opens the streaming subscription and
forwards each delivered message to the collector via `env.push`. The source's
`push` is a deliberate no-op stub (the framework never calls it). `destroy()`
closes the subscriber gracefully, honoring `shutdownTimeoutMs` (default 30000).

### Quickstart, push webhook

```typescript
import express from 'express';
import { sourcePubSubPush } from '@walkeros/server-source-gcp';
import { startFlow } from '@walkeros/collector';

const { sources } = await startFlow({
  sources: {
    pubsub: {
      code: sourcePubSubPush,
      config: {
        settings: { decoder: 'json' },
      },
    },
  },
  destinations: {
    // Your destinations
  },
});

const app = express();
app.use(express.json());
app.post('/pubsub-push', sources.pubsub.push);
app.listen(8080);
```

Pub/Sub POSTs each message envelope to `/pubsub-push`. The source decodes the
envelope, base64-decodes the data field, runs the configured decoder, and
forwards to the collector. Returns 200 on success, 400 on malformed envelope,
401 when OIDC verification fails, 500 on push failure (Pub/Sub will retry per
the subscription's retry policy).

### Authentication

Three modes, in precedence order:

1. **Pre-configured client** (`settings.client`). When you bring your own
   `PubSub` instance with custom auth, this bypasses credentials resolution.
2. **Service account JSON** (`settings.credentials`). Pass an object
   `{ client_email, private_key }` or a JSON string the source will parse.
3. **Application Default Credentials (ADC)**. The default. Works on GCP compute
   (Cloud Run, GCE, GKE, Cloud Functions) and locally via
   `gcloud auth application-default login`.

```typescript
// Service account (object form)
config: {
  settings: {
    projectId: 'my-project',
    subscription: 'events-sub',
    credentials: {
      client_email: 'sa@my-project.iam.gserviceaccount.com',
      private_key: '-----BEGIN PRIVATE KEY-----\n...',
    },
  },
}
```

### Setup, idempotent subscription provisioning

`walkeros setup source.<id>` provisions the subscription. Idempotent: safe to
re-run; `ALREADY_EXISTS` is non-fatal. Drift detection emits `setup.drift`
warnings without auto-mutating.

```typescript
config: {
  setup: {
    createTopic: true,           // Create the topic if missing (default: false)
    ackDeadlineSeconds: 60,
    deadLetterPolicy: {
      deadLetterTopic: 'events-dlq',
      maxDeliveryAttempts: 5,
      createDeadLetterTopic: true,
    },
    retryPolicy: {
      minimumBackoff: { seconds: 10 },
      maximumBackoff: { seconds: 600 },
    },
  },
  settings: {
    projectId: 'my-project',
    subscription: 'events-sub',
    topic: 'events',
  },
}
```

Auto-created topics use the EU multi-region storage policy (`eu-west1`,
`eu-west3`, `eu-west4`). Operators in non-EU regions should override
`messageStoragePolicy` per organisation policy.

The destination side (`@walkeros/server-destination-gcp`) provisions the topic
itself; you can use either side's setup for the topic. Subscription provisioning
is owned exclusively by this source.

### Decoders

| Decoder          | Behavior                                                                   |
| ---------------- | -------------------------------------------------------------------------- |
| `json` (default) | `JSON.parse(data.toString('utf8'))`. Throws DecoderError on parse failure. |
| `text`           | `data.toString('utf8')`. The text becomes the event payload.               |
| `raw`            | The raw `Buffer` is forwarded as-is.                                       |

### Backpressure and flow control

The pull subscriber has built-in flow control:

- `maxMessages` (default 100): max concurrent in-flight messages.
- `maxBytes` (default 10 MB): max concurrent in-flight bytes.

The subscriber automatically slows down when the collector pushes back. Tune via
`settings.flowControl`.

### OIDC verification (push mode)

Off by default. Enable per push subscription when your endpoint is publicly
reachable:

```typescript
config: {
  settings: {
    verifyOidc: true,
    audience: 'https://my-service.example/pubsub-push',
  },
}
```

The source verifies the `Authorization: Bearer <jwt>` header against GCP public
keys via `google-auth-library`. Misconfigured OIDC silently rejects all
messages, so leave it off when running behind a private network and rely on
network isolation instead.

### Emulator

Both pull and push honor `PUBSUB_EMULATOR_HOST`. For explicit configuration, set
`settings.apiEndpoint`:

```typescript
config: {
  settings: {
    projectId: 'my-project',
    subscription: 'events-sub',
    apiEndpoint: 'localhost:8085',
  },
}
```

### Troubleshooting

- **Subscription not found / unauthorized.** The pull source logs a canonical
  hint:
  `Pub/Sub subscription "X" not found or unauthorized in project "Y". Run "walkeros setup source.<id>" to create it.`
  Run setup or grant `roles/pubsub.subscriber` to the runtime service account.
- **JSON decode failures.** Default `onPushError: 'nack'` redelivers; set
  `onPushError: 'ack'` to drop instead. Switch to `decoder: 'raw'` if your
  payloads are binary (Avro, Protobuf, etc.) and decode in a transformer.
- **Push 401 with OIDC enabled.** Verify the audience matches your endpoint URL
  exactly. Pub/Sub signs tokens with the configured audience.
