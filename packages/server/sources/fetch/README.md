# @walkeros/server-source-fetch

> Web Standard Fetch API source for walkerOS - Deploy to any modern
> edge/serverless platform

## What This Source Does

**Accepts** walkerOS events via HTTP (Fetch API) **Forwards** events to
collector for processing **Returns** HTTP responses with CORS support

This is an HTTP transport layer - it accepts events in walkerOS format and
forwards them to the collector. Not a transformation source.

## Features

- ✅ **Web Standard Fetch API** - Native `(Request) => Response` signature
- ✅ **Platform Agnostic** - Cloudflare Workers, Vercel Edge, Deno, Bun, Node.js
  18+
- ✅ **Event Validation** - Zod schema validation with detailed error messages
- ✅ **Batch Processing** - Handle multiple events in single request
- ✅ **CORS Support** - Configurable cross-origin resource sharing
- ✅ **Pixel Tracking** - 1x1 transparent GIF for GET requests
- ✅ **Request Limits** - Configurable size and batch limits
- ✅ **Health Checks** - Built-in `/health` endpoint

## Installation

```bash
npm install @walkeros/server-source-fetch @walkeros/collector @walkeros/core
```

## Quick Start

```typescript
import { sourceFetch, type SourceFetch } from '@walkeros/server-source-fetch';
import { startFlow } from '@walkeros/collector';

const { elb } = await startFlow<SourceFetch.Push>({
  sources: { api: { code: sourceFetch } },
});

export default { fetch: elb };
```

## Multi-Path with Method Control

```typescript
const { sources } = await startFlow({
  sources: {
    api: {
      code: sourceFetch,
      config: {
        settings: {
          paths: [
            '/collect', // GET + POST (default)
            { path: '/pixel', methods: ['GET'] }, // GET only (pixel tracking)
            { path: '/ingest', methods: ['POST'] }, // POST only (JSON ingestion)
            { path: '/webhooks/*', methods: ['POST'] }, // POST wildcard
          ],
        },
      },
    },
  },
});
```

## Platform Deployment

### Cloudflare Workers

```typescript
import { sourceFetch, type SourceFetch } from '@walkeros/server-source-fetch';
import { startFlow } from '@walkeros/collector';

const { elb } = await startFlow<SourceFetch.Push>({
  sources: {
    api: {
      code: sourceFetch,
      config: { settings: { paths: ['/collect'], cors: true } },
    },
  },
  destinations: {
    // Your destinations
  },
});

export default { fetch: elb };
```

**Deploy:** `wrangler deploy`

### Vercel Edge Functions

```typescript
// api/collect.ts
export const config = { runtime: 'edge' };

import { sourceFetch, type SourceFetch } from '@walkeros/server-source-fetch';
import { startFlow } from '@walkeros/collector';

const { elb } = await startFlow<SourceFetch.Push>({
  sources: { api: { code: sourceFetch } },
});

export default elb;
```

### Deno Deploy

```typescript
import { sourceFetch, type SourceFetch } from '@walkeros/server-source-fetch';
import { startFlow } from '@walkeros/collector';

const { elb } = await startFlow<SourceFetch.Push>({
  sources: { api: { code: sourceFetch } },
});

Deno.serve(elb);
```

### Bun

```typescript
import { sourceFetch, type SourceFetch } from '@walkeros/server-source-fetch';
import { startFlow } from '@walkeros/collector';

const { elb } = await startFlow<SourceFetch.Push>({
  sources: { api: { code: sourceFetch } },
});

Bun.serve({ fetch: elb, port: 3000 });
```

## Usage Examples

### Single Event (POST)

```javascript
fetch('https://your-endpoint.com/collect', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'page view',
    data: { title: 'Home', path: '/' },
    user: { id: 'user-123' },
    globals: { language: 'en' },
  }),
});
```

### Batch Events (POST)

```javascript
fetch('https://your-endpoint.com/collect', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    batch: [
      { name: 'page view', data: { title: 'Home' } },
      { name: 'button click', data: { id: 'cta' } },
      { name: 'form submit', data: { formId: 'contact' } },
    ],
  }),
});
```

### Pixel Tracking (GET)

```html
<img
  src="https://your-endpoint.com/collect?event=page%20view&data[title]=Home&user[id]=user123"
  width="1"
  height="1"
/>
```

### Health Check

```bash
curl https://your-endpoint.com/health
# {"status":"ok","timestamp":1234567890,"source":"fetch"}
```

## Configuration

```typescript
interface Settings {
  /**
   * Route paths to handle.
   * String shorthand accepts GET+POST. RouteConfig allows per-route method control.
   * @default ['/collect']
   */
  paths?: Array<string | RouteConfig>;

  /**
   * @deprecated Use `paths` instead. Converted to `paths: [path]` internally.
   */
  path?: string;

  cors: boolean | CorsOptions; // CORS config (default: true)
  healthPath: string; // Health check path (default: '/health')
  maxRequestSize: number; // Max bytes (default: 102400 = 100KB)
  maxBatchSize: number; // Max events per batch (default: 100)
}

interface RouteConfig {
  /** URL path pattern (supports wildcards like /api/*) */
  path: string;
  /** HTTP methods to accept. OPTIONS always included for CORS. */
  methods?: ('GET' | 'POST')[];
}

interface CorsOptions {
  origin?: string | string[] | '*';
  methods?: string[];
  headers?: string[];
  credentials?: boolean;
  maxAge?: number;
}
```

## Ingest Metadata

Extract request metadata and forward it to processors and destinations:

```typescript
const { elb } = await startFlow<SourceFetch.Push>({
  sources: {
    api: {
      code: sourceFetch,
      config: {
        settings: { cors: true },
        ingest: {
          ua: { fn: (req) => req.headers.get('user-agent') },
          origin: { fn: (req) => req.headers.get('origin') },
          url: 'url',
        },
      },
    },
  },
});
```

**Available ingest paths:**

| Path                  | Description                                              |
| --------------------- | -------------------------------------------------------- |
| `url`                 | Full request URL                                         |
| `headers.get('name')` | Via function: `{ fn: (req) => req.headers.get('name') }` |

> **Note:** The Fetch API uses `Request` objects where headers are accessed via
> `.get()` method. Use mapping functions for header extraction.

## Error Responses

### Validation Error

```json
{
  "success": false,
  "error": "Event validation failed",
  "validationErrors": [
    { "path": "name", "message": "Event name is required" },
    { "path": "nested.0.entity", "message": "Required" }
  ]
}
```

### Batch Partial Failure (207 Multi-Status)

```json
{
  "success": false,
  "processed": 2,
  "failed": 1,
  "errors": [
    { "index": 1, "error": "Validation failed: Event name is required" }
  ]
}
```

## Input Format

Accepts standard walkerOS events. See
[@walkeros/core Event documentation](../../../core#event-structure).

Required field:

- `name` (string) - Event name in "entity action" format (e.g., "page view")

Optional fields:

- `data` - Event-specific properties
- `user` - User identification
- `context` - Ordered context properties
- `globals` - Global properties
- `custom` - Custom properties
- `nested` - Nested entities
- `consent` - Consent flags

## Testing

```bash
npm test        # Run tests
npm run dev     # Watch mode
npm run lint    # Type check + lint
npm run build   # Build package
```

## Development

Follows walkerOS XP principles:

- **DRY** - Uses @walkeros/core utilities
- **KISS** - Minimal HTTP wrapper
- **TDD** - Example-driven tests
- **No `any`** - Strict TypeScript

See [AGENT.md](../../../../AGENT.md) for walkerOS development guide.

## Related

- [@walkeros/server-source-express](../express/) - Alternative for Express.js
- [@walkeros/core](../../../../packages/core/) - Core utilities

## License

MIT
