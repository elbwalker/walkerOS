# @walkeros/server-source-gcp

Google Cloud Platform server sources for walkerOS - lightweight, single-purpose
runtime adapters for GCP services.

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
