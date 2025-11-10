# @walkeros/docker

Docker container for walkerOS with three operational modes: bundle, collect, and
serve.

## Features

- **Zero-duplication architecture** - Uses @walkeros/cli for bundling, no custom
  code
- **Sources own infrastructure** - Express servers, PubSub clients managed by
  sources
- **Single entry point** - Same code works for all modes
- **JSON configuration** - Compatible with @walkeros/cli config format

## Operational Modes

### Bundle Mode

Generate optimized JavaScript bundles for client-side usage.

```bash
docker run -e MODE=bundle \
  -v $(pwd)/config.json:/app/config.json \
  -v $(pwd)/dist:/app/dist \
  walkeros/docker
```

### Collect Mode

Run an HTTP server that collects events and sends them to configured
destinations.

```bash
docker run -e MODE=collect \
  -v $(pwd)/config.json:/app/config.json \
  -p 8080:8080 \
  walkeros/docker
```

### Serve Mode

Serve static files (typically generated bundles) via HTTP.

```bash
docker run -e MODE=serve \
  -v $(pwd)/dist:/app/dist \
  -p 8080:8080 \
  walkeros/docker
```

## Configuration

Configuration uses JSON format compatible with @walkeros/cli.

### Collect Mode Example

```json
{
  "platform": "node",
  "packages": {
    "@walkeros/collector": {}
  },
  "code": "",
  "sources": {
    "http": {
      "code": "sourceExpress",
      "config": {
        "settings": {
          "endpoint": "/collect",
          "port": 8080,
          "cors": true
        }
      }
    }
  },
  "destinations": {
    "console": {
      "code": "destinationConsole",
      "config": {
        "settings": {
          "pretty": true,
          "prefix": "[walkerOS]"
        }
      }
    }
  },
  "collector": {
    "run": true,
    "globals": {
      "environment": "production"
    }
  },
  "docker": {
    "port": 8080,
    "collect": {
      "gracefulShutdown": 25000
    }
  }
}
```

### Bundle Mode Example

```json
{
  "platform": "web",
  "build": {
    "platform": "browser",
    "format": "iife",
    "minify": true,
    "globalName": "walkerOS"
  },
  "packages": {
    "@walkeros/collector": {
      "version": "latest",
      "imports": ["startFlow"]
    },
    "@walkeros/web-source-browser": {
      "version": "latest",
      "imports": ["sourceBrowser"]
    },
    "@walkeros/web-destination-gtag": {
      "version": "latest",
      "imports": ["destinationGtag"]
    }
  },
  "code": "",
  "sources": {
    "browser": {
      "code": "sourceBrowser"
    }
  },
  "destinations": {
    "gtag": {
      "code": "destinationGtag",
      "config": {
        "settings": {
          "ga4": {
            "measurementId": "${GA4_MEASUREMENT_ID}"
          }
        }
      }
    }
  },
  "output": "/app/dist/walker.js"
}
```

## Environment Variables

### Required

- `MODE` - Operational mode: `bundle`, `collect`, or `serve`

### Optional

- `CONFIG_FILE` - Path to configuration file (default: `/app/config.json`)
- `DEBUG` - Enable debug logging (default: `false`)

### Secrets

Use environment variables in config with `${VAR_NAME}` syntax:

```json
{
  "destinations": {
    "bigquery": {
      "config": {
        "settings": {
          "projectId": "${GCP_PROJECT_ID}",
          "credentials": "${GCP_CREDENTIALS}"
        }
      }
    }
  }
}
```

## Phase 1: Built-in Sources and Destinations

### Sources

- **sourceExpress** - HTTP server for event collection
  - Owns Express server lifecycle
  - Handles CORS, JSON parsing, health checks
  - Graceful shutdown support

### Destinations

- **destinationConsole** - Console logging for testing
  - Pretty-printed or compact JSON output
  - Configurable prefix and context inclusion

## Docker Compose Example

```yaml
version: '3.8'

services:
  walker-collect:
    image: walkeros/docker:latest
    environment:
      - MODE=collect
      - CONFIG_FILE=/app/config.json
    ports:
      - '8080:8080'
    volumes:
      - ./config.json:/app/config.json
    restart: unless-stopped
    healthcheck:
      test: ['CMD', 'curl', '-f', 'http://localhost:8080/health']
      interval: 30s
      timeout: 3s
      retries: 3

  walker-serve:
    image: walkeros/docker:latest
    environment:
      - MODE=serve
    ports:
      - '8081:8080'
    volumes:
      - ./dist:/app/dist
    restart: unless-stopped
```

## Development

### Build

```bash
npm run build
```

### Run Locally

```bash
# Collect mode
MODE=collect CONFIG_FILE=./configs/examples/collect-basic.json npm run dev

# Bundle mode
MODE=bundle CONFIG_FILE=./configs/examples/bundle-web.json npm run dev

# Serve mode
MODE=serve CONFIG_FILE=./configs/examples/serve-static.json npm run dev
```

### Build Docker Image

```bash
docker build -t walkeros/docker:latest -f packages/docker/Dockerfile .
```

## Architecture

### Zero-Duplication Design

1. **CLI Integration** - Uses @walkeros/cli for all bundling operations
2. **Source Infrastructure** - Sources manage their own servers/subscriptions
3. **Unified Config** - Same JSON schema works for CLI and Docker
4. **Single Entry** - One `index.ts` handles all modes

### Data Flow

**Collect Mode:**

```
HTTP Request → Express Source → Collector → Destinations → External APIs
```

**Bundle Mode:**

```
JSON Config → CLI Bundler → Optimized JS Bundle
```

**Serve Mode:**

```
HTTP Request → Express Static → Files
```

## Roadmap

### Phase 1 (Current)

- ✅ Bundle mode with CLI integration
- ✅ Collect mode with Express source
- ✅ Serve mode for static files
- ✅ Console destination for testing
- ✅ Environment variable substitution
- ✅ Dockerfile with multi-stage build

### Phase 2 (Future)

- ⏳ Dev mode with hot reload (`DEV=true`)
- ⏳ Production bundled execution for collect mode
- ⏳ Additional sources (PubSub, EventBridge, SQS)
- ⏳ Import destinations from @walkeros packages
- ⏳ Kubernetes deployment examples
- ⏳ Metrics and monitoring endpoints

## License

MIT

## Support

- GitHub Issues: https://github.com/elbwalker/walkerOS/issues
- Documentation: https://github.com/elbwalker/walkerOS
