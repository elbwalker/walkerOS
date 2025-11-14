# @walkeros/docker

Production-ready Docker container for walkerOS with built-in flow
configurations.

## Quick Start

```bash
# Run demo (flows are already in the image)
docker run -e MODE=collect -e FLOW=/app/flows/demo.json walkeros/docker:latest
```

That's it! The demo will:

- Download source-demo and destination-demo packages from npm
- Emit test events with delays
- Log filtered event output
- Run completely self-contained

## Built-in Flows

All flows are included in the Docker image at `/app/flows/`:

- **demo.json** - Demo packages (source-demo → destination-demo)
- **express-console.json** - HTTP collection → console logging
- **serve.json** - Static file serving

## Usage

### Demo Mode

```bash
docker run -e MODE=collect -e FLOW=/app/flows/demo.json walkeros/docker
```

### HTTP Collection Server

```bash
docker run -p 8080:8080 \
  -e MODE=collect \
  -e FLOW=/app/flows/express-console.json \
  walkeros/docker

# Send event
curl -X POST http://localhost:8080/collect \
  -H "Content-Type: application/json" \
  -d '{"event":"page view","data":{"title":"Test"}}'
```

### Serve Static Files

```bash
docker run -p 8080:8080 \
  -e MODE=serve \
  -e FLOW=/app/flows/serve.json \
  -v $(pwd)/dist:/app/dist \
  walkeros/docker
```

_Note: Volume mount needed to serve your files_

## Custom Flow Configuration

### Option 1: Build Custom Image (Recommended)

```dockerfile
FROM walkeros/docker:latest
COPY my-flow.json /app/flows/custom.json
```

```bash
docker build -t my-walker .
docker run -e MODE=collect -e FLOW=/app/flows/custom.json my-walker
```

### Option 2: Mount Custom Flow

```bash
docker run \
  -e MODE=collect \
  -e FLOW=/app/custom.json \
  -v $(pwd)/my-flow.json:/app/custom.json \
  walkeros/docker
```

## Modes

Two operational modes:

- **collect** - Run event collection server
- **serve** - Serve static files

**Note**: Bundle generation is handled by `@walkeros/cli`. See
[CLI documentation](../cli/README.md) for details.

## Flow Configuration

Flow files use the NEW format with separate `flow` and `build` sections:

```json
{
  "flow": {
    "platform": "server",
    "sources": {
      "http": {
        "code": "sourceExpress",
        "config": {
          "settings": {
            "path": "/collect",
            "port": 8080,
            "cors": true
          }
        }
      }
    },
    "destinations": {
      "demo": {
        "code": "destinationDemo",
        "config": {
          "settings": {
            "name": "Console Output",
            "values": ["name", "data", "timestamp"]
          }
        }
      }
    },
    "collector": { "run": true }
  },
  "build": {
    "packages": {
      "@walkeros/collector": {
        "version": "latest",
        "imports": ["startFlow"]
      },
      "@walkeros/server-source-express": {
        "version": "latest",
        "imports": ["sourceExpress"]
      },
      "@walkeros/destination-demo": {
        "version": "latest",
        "imports": ["destinationDemo"]
      }
    },
    "code": "// Custom initialization\n",
    "template": "/app/packages/cli/templates/base.hbs",
    "tempDir": "/tmp"
  }
}
```

### Configuration Structure

**Flow section** (runtime configuration):

- **platform**: "web" or "server"
- **sources**: Event sources with `code` field referencing imports
- **destinations**: Event destinations with `code` field referencing imports
- **collector**: Processing settings

**Build section** (build-time configuration):

- **packages**: npm packages to download dynamically with version and imports
- **code**: Custom initialization code (required, can be a comment)
- **template**: Path to Handlebars template for bundle generation
- **tempDir**: Temporary directory for build artifacts

### Port Configuration

Ports are defined in source settings within the `flow` section:

```json
{
  "flow": {
    "sources": {
      "http": {
        "config": {
          "settings": {
            "port": 8080
          }
        }
      }
    }
  }
}
```

Then map with `-p 8080:8080` in docker run.

## Environment Variables

### Required

- `MODE` - Operational mode: `collect` or `serve`
- `FLOW` - Path to flow configuration file

### Optional

- `DEBUG` - Enable debug logging (default: `false`)
- `PORT` - Override port from config
- `HOST` - Override host from config

### Variable Substitution

Use environment variables in flow files with `${VAR_NAME}` or
`${VAR_NAME:default}` syntax:

```json
{
  "flow": {
    "destinations": {
      "gtag": {
        "config": {
          "settings": {
            "ga4": {
              "measurementId": "${GA4_MEASUREMENT_ID}"
            }
          }
        }
      }
    }
  }
}
```

## Docker Compose

```yaml
version: '3.8'

services:
  walkeros:
    image: walkeros/docker:latest
    environment:
      MODE: collect
      FLOW: /app/flows/demo.json
    restart: unless-stopped
```

### Collect Mode with Port Mapping

```yaml
services:
  walkeros-collect:
    image: walkeros/docker:latest
    environment:
      MODE: collect
      FLOW: /app/flows/collect-console.json
    ports:
      - '8080:8080'
    restart: unless-stopped
    healthcheck:
      test:
        [
          'CMD',
          'node',
          '-e',
          "require('http').get('http://localhost:8080/health', (r) =>
          process.exit(r.statusCode === 200 ? 0 : 1))",
        ]
      interval: 30s
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

## Development

### Build

```bash
npm run build
```

### Run Locally

```bash
# Demo mode
MODE=collect FLOW=./flows/demo.json npm run dev

# Collect mode
MODE=collect FLOW=./flows/express-console.json npm run dev

# Serve mode
MODE=serve FLOW=./flows/serve.json npm run dev
```

### Docker Testing

See comprehensive guides in [docs/](./docs/):

- **[LOCAL-TESTING.md](./docs/LOCAL-TESTING.md)** - Testing Docker images
  locally
- **[DOCKER-HUB.md](./docs/DOCKER-HUB.md)** - Publishing to Docker Hub
- **[DEPLOYMENT-CHECKLIST.md](./docs/DEPLOYMENT-CHECKLIST.md)** - Deployment
  verification

Quick start:

```bash
# Build image
docker build -t walkeros/docker:latest -f packages/docker/Dockerfile .

# Test demo flow
docker run -e MODE=collect -e FLOW=/app/flows/demo.json walkeros/docker:latest
```

## Architecture

### Zero-Duplication Design

1. **CLI Integration** - Uses @walkeros/cli for all bundling operations
2. **Source Infrastructure** - Sources manage their own servers/subscriptions
3. **Unified Config** - Same JSON schema works for CLI and Docker
4. **Single Entry** - One `index.ts` handles all modes
5. **Built-in Flows** - Example configurations baked into image

### Data Flow

**Collect Mode:**

```
HTTP Request → Express Source → Collector → Destinations → External APIs
```

**Serve Mode:**

```
HTTP Request → Express Static → Files
```

**Note**: Bundle generation uses `@walkeros/cli` - see CLI documentation.

## Troubleshooting

### FLOW not found

- Check FLOW path points to file in container
- Built-in flows: `/app/flows/*.json`
- Custom flows: mount with `-v` or bake into image

### Port already in use

- Check port in flow.json source settings
- Update docker port mapping: `-p XXXX:XXXX`

### Package download fails

- Check internet connectivity
- Verify npm registry access

## Docker Hub

Official image: `walkeros/docker`

```bash
# Pull latest
docker pull walkeros/docker:latest

# Pull specific version
docker pull walkeros/docker:0.1.0
```

## Roadmap

### Phase A ✅ Complete

- ✅ Collect mode with Express source
- ✅ Serve mode for static files
- ✅ Console destination for testing
- ✅ Environment variable substitution
- ✅ Dockerfile with multi-stage build (Node 22)
- ✅ Tini for proper signal handling
- ✅ Non-root user (walker:1001)
- ✅ Built-in flow examples
- ✅ docker-compose examples

### Phase B ✅ Complete (CLI Integration)

- ✅ Removed bundle mode from Docker (use `@walkeros/cli` instead)
- ✅ CLI `run` command for Docker orchestration
- ✅ Simplified Docker to 2 modes: collect & serve
- ✅ Zero code duplication architecture

### Phase C (Next)

- ⏳ Production logging and metrics
- ⏳ Performance testing and optimization
- ⏳ Multi-platform builds (amd64, arm64)
- ⏳ Additional sources (PubSub, EventBridge, SQS)
- ⏳ Docker image publishing automation

## License

MIT

## Support

- GitHub Issues: https://github.com/elbwalker/walkerOS/issues
- Documentation: https://github.com/elbwalker/walkerOS
