# @walkeros/server-source-express

Express server source for walkerOS - turn-key HTTP event collection server with
Express.js.

## Installation

```bash
npm install @walkeros/server-source-express
```

## Quick Start

### Standalone Server (Docker-style)

```typescript
import { startFlow } from '@walkeros/collector';
import { sourceExpress } from '@walkeros/server-source-express';

const { collector } = await startFlow({
  sources: {
    express: {
      code: sourceExpress,
      config: {
        settings: {
          port: 8080, // Start server on port 8080
        },
      },
    },
  },
  destinations: {
    // Your destinations here
  },
});

// Server is now running!
// POST http://localhost:8080/collect - JSON event ingestion
// GET  http://localhost:8080/collect - Pixel tracking
// GET  http://localhost:8080/health  - Health check
```

### App-Only Mode (Custom Integration)

```typescript
const { collector } = await startFlow({
  sources: {
    express: {
      code: sourceExpress,
      config: {
        settings: {
          // No port = app only, no server started
          paths: ['/events'],
          cors: false, // Handle CORS with your own middleware
        },
      },
    },
  },
});

// Access the Express app
const expressSource = collector.sources.express;
const app = expressSource.app;

// Add custom middleware
app.use(yourAuthMiddleware);

// Add custom routes
app.get('/custom', customHandler);

// Start server manually
app.listen(3000);
```

## Configuration

### Settings

```typescript
interface Settings {
  /**
   * HTTP server port to listen on
   * If not provided, server will not start (app-only mode)
   * @optional
   */
  port?: number;

  /**
   * Route paths to register
   * String shorthand registers GET+POST. RouteConfig allows per-route method control.
   * @default ['/collect']
   */
  paths?: Array<string | RouteConfig>;

  /**
   * @deprecated Use `paths` instead. Will be removed in next major.
   * Converted to `paths: [path]` internally.
   */
  path?: string;

  /**
   * CORS configuration
   * - false: Disabled
   * - true: Allow all origins (default)
   * - object: Custom CORS options
   * @default true
   */
  cors?: boolean | CorsOptions;

  /**
   * Enable health check endpoints
   * - GET /health (liveness check)
   * - GET /ready (readiness check)
   * @default true
   */
  status?: boolean;
}

interface RouteConfig {
  /** Express route path (supports wildcards like /api/*) */
  path: string;
  /** HTTP methods to register. OPTIONS always included for CORS. */
  methods?: ('GET' | 'POST')[];
}
```

### CORS Options

```typescript
interface CorsOptions {
  /** Allowed origins (string, array, or '*') */
  origin?: string | string[] | '*';

  /** Allowed HTTP methods */
  methods?: string[];

  /** Allowed request headers */
  headers?: string[];

  /** Allow credentials (cookies, authorization) */
  credentials?: boolean;

  /** Preflight cache duration in seconds */
  maxAge?: number;
}
```

## HTTP Methods

### POST - Standard Event Ingestion

Send events as JSON in the request body.

**Request:**

```bash
curl -X POST http://localhost:8080/collect \
  -H "Content-Type: application/json" \
  -d '{
    "event": "page view",
    "data": {
      "title": "Home Page",
      "path": "/"
    },
    "user": {
      "id": "user123"
    }
  }'
```

**Response:**

```json
{
  "success": true,
  "timestamp": 1647261462000
}
```

### GET - Pixel Tracking

Send events as query parameters. Returns a 1x1 transparent GIF.

**Request:**

```html
<!-- In your HTML -->
<img
  src="http://localhost:8080/collect?event=page%20view&data[title]=Home&user[id]=user123"
  width="1"
  height="1"
  alt=""
/>
```

**Response:**

```
Content-Type: image/gif
Cache-Control: no-cache, no-store, must-revalidate

[1x1 transparent GIF binary]
```

### OPTIONS - CORS Preflight

Automatically handled for cross-origin requests.

**Request:**

```bash
curl -X OPTIONS http://localhost:8080/collect \
  -H "Origin: https://example.com"
```

**Response:**

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, OPTIONS
Access-Control-Allow-Headers: Content-Type

204 No Content
```

## Health Checks

### GET /health - Liveness Check

Returns server status (always returns 200 if server is running).

**Response:**

```json
{
  "status": "ok",
  "timestamp": 1647261462000,
  "source": "express"
}
```

### GET /ready - Readiness Check

Returns readiness status (same as health for Express source).

**Response:**

```json
{
  "status": "ready",
  "timestamp": 1647261462000,
  "source": "express"
}
```

## Advanced Examples

### Custom CORS Configuration

```typescript
await startFlow({
  sources: {
    express: {
      code: sourceExpress,
      config: {
        settings: {
          port: 8080,
          cors: {
            origin: ['https://app.example.com', 'https://admin.example.com'],
            credentials: true,
            methods: ['GET', 'POST', 'OPTIONS'],
            headers: ['Content-Type', 'Authorization'],
            maxAge: 86400, // 24 hours
          },
        },
      },
    },
  },
});
```

### Disable Health Checks

```typescript
await startFlow({
  sources: {
    express: {
      code: sourceExpress,
      config: {
        settings: {
          port: 8080,
          status: false, // Disable /health and /ready endpoints
        },
      },
    },
  },
});
```

### Custom Endpoint Paths

```typescript
await startFlow({
  sources: {
    express: {
      code: sourceExpress,
      config: {
        settings: {
          port: 8080,
          paths: ['/api/v1/events'], // Custom path (GET + POST)
        },
      },
    },
  },
});
```

### Multi-Path with Method Control

```typescript
await startFlow({
  sources: {
    express: {
      code: sourceExpress,
      config: {
        settings: {
          port: 8080,
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

### Ingest Metadata

Extract request metadata (IP, headers) and forward it to processors and
destinations:

```typescript
await startFlow({
  sources: {
    express: {
      code: sourceExpress,
      config: {
        settings: { port: 8080 },
        ingest: {
          ip: 'ip',
          ua: 'headers.user-agent',
          origin: 'headers.origin',
          referer: 'headers.referer',
        },
      },
    },
  },
});
```

**Available ingest paths:**

| Path        | Description                                      |
| ----------- | ------------------------------------------------ |
| `ip`        | Client IP address                                |
| `headers.*` | HTTP headers (user-agent, origin, referer, etc.) |
| `protocol`  | Request protocol (http/https)                    |
| `method`    | HTTP method (GET, POST, etc.)                    |
| `hostname`  | Request hostname                                 |
| `url`       | Full request URL                                 |

**Advanced mapping:**

```typescript
ingest: {
  // Custom function for geo lookup
  country: { fn: (req) => geoip.lookup(req.ip)?.country },

  // Conditional extraction
  devMode: {
    key: 'headers.x-debug',
    condition: (req) => req.hostname === 'localhost',
  },

  // Nested structure
  request: {
    map: {
      ua: 'headers.user-agent',
      origin: 'headers.origin',
    },
  },
}
```

### Extend Express App

```typescript
const { collector } = await startFlow({
  sources: {
    express: {
      code: sourceExpress,
      config: {
        settings: { port: 8080 },
      },
    },
  },
});

// Access Express app for advanced customization
const expressSource = collector.sources.express;
const app = expressSource.app;

// Add authentication middleware
app.use('/collect', authMiddleware);

// Add rate limiting
import rateLimit from 'express-rate-limit';
app.use(
  '/collect',
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
  }),
);

// Add custom logging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});
```

## Event Format

### Single Event

```json
{
  "event": "page view",
  "data": {
    "title": "Home Page",
    "path": "/"
  },
  "context": {
    "language": ["en", 0],
    "currency": ["USD", 0]
  },
  "user": {
    "id": "user123",
    "device": "device456"
  },
  "globals": {
    "appVersion": "1.0.0"
  },
  "consent": {
    "functional": true,
    "marketing": true
  }
}
```

### Query Parameters (GET)

For pixel tracking, use nested bracket notation:

```
?event=page%20view
&data[title]=Home%20Page
&data[path]=/
&user[id]=user123
&consent[marketing]=true
```

This is automatically parsed by `requestToData` from `@walkeros/core`.

## Architecture

### Infrastructure Ownership

The Express source **owns its HTTP infrastructure**:

- ✅ Creates Express application
- ✅ Configures middleware (JSON parsing, CORS)
- ✅ Registers routes (POST, GET, OPTIONS)
- ✅ Starts HTTP server (if port configured)
- ✅ Handles graceful shutdown (SIGTERM, SIGINT)

This design enables:

1. **Turn-key deployment** - Just specify a port and deploy
2. **Docker-friendly** - Perfect for containerized environments
3. **Flexibility** - App-only mode for custom integrations

### Request Flow

```
┌─────────────────────────────────────────┐
│ HTTP Client (Browser, Server, etc.)    │
└─────────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────────┐
│ EXPRESS SOURCE                          │
│ - Receives HTTP request                 │
│ - Parses body/query params              │
│ - Validates request structure           │
│ - Calls env.push() → Collector          │
│ - Returns HTTP response                 │
└─────────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────────┐
│ COLLECTOR                               │
│ - Event validation & processing         │
│ - Consent management                    │
│ - Mapping rules                         │
│ - Routes to destinations                │
└─────────────────────────────────────────┘
```

## Deployment

Use the [walkerOS Docker image](https://hub.docker.com/r/walkeros/flow) for
deployment:

```bash
# Bundle your flow with a Dockerfile
walkeros bundle flow.json --dockerfile

# Build and run
cd dist
docker build -t my-flow .
docker run -p 8080:8080 my-flow
```

See the [Docker documentation](https://www.walkeros.io/docs/apps/docker) for
Cloud Run, Kubernetes, and other deployment options.

## Testing

The package includes comprehensive tests using mocked Express Request/Response
objects.

**Run tests:**

```bash
npm test
```

**Example test:**

```typescript
import { sourceExpress } from '@walkeros/server-source-express';

test('should process POST event', async () => {
  const mockPush = jest.fn().mockResolvedValue({ event: { id: 'test' } });

  const source = await sourceExpress(
    {},
    {
      push: mockPush,
      command: jest.fn(),
      elb: jest.fn(),
    },
  );

  const req = {
    method: 'POST',
    body: { event: 'page view', data: { title: 'Home' } },
    headers: {},
    get: () => undefined,
  };
  const res = {
    status: jest.fn().returnThis(),
    json: jest.fn(),
    send: jest.fn(),
    set: jest.fn(),
  };

  await source.push(req, res);

  expect(res.status).toHaveBeenCalledWith(200);
  expect(mockPush).toHaveBeenCalled();
});
```

## License

MIT

## Links

- [walkerOS Documentation](https://github.com/elbwalker/walkerOS)
- [Express.js](https://expressjs.com/)
- [GitHub Repository](https://github.com/elbwalker/walkerOS)
- [Report Issues](https://github.com/elbwalker/walkerOS/issues)
