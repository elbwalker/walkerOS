# Server Flow Deployment Guide

End-to-end guide for creating, testing, and deploying a server-side event
collection flow.

## Prerequisites

- walkerOS CLI installed: `npm install -g @walkeros/cli`
- A walkerOS project (create at app.walkeros.io or via API)
- Authentication: `WALKEROS_TOKEN` and `WALKEROS_PROJECT_ID` set

## 1. Create the Flow Config

Server flows use `"server": {}` instead of `"web": {}`. A minimal server flow
needs an HTTP source (Express) for health checks and event collection:

```json
{
  "version": 3,
  "flows": {
    "default": {
      "server": {},
      "packages": {
        "@walkeros/collector": { "imports": ["startFlow"] },
        "@walkeros/server-source-express": {},
        "@walkeros/destination-demo": {}
      },
      "sources": {
        "http": {
          "package": "@walkeros/server-source-express",
          "config": {
            "settings": {
              "port": 8080,
              "cors": true,
              "status": true
            }
          }
        }
      },
      "destinations": {
        "demo": {
          "package": "@walkeros/destination-demo",
          "config": {
            "settings": { "name": "my-server-flow" }
          }
        }
      }
    }
  }
}
```

**Key settings:**

| Setting | Required    | Purpose                                                                                          |
| ------- | ----------- | ------------------------------------------------------------------------------------------------ |
| `port`  | Yes         | HTTP server port. Set to `8080` — the runtime overrides this from `PORT` env var at deploy time. |
| `cors`  | Recommended | Enable CORS for cross-origin event collection                                                    |

> **Note:** Health check endpoints (`/health`, `/ready`) are provided by the
> runner, not by sources. No source-level health configuration is needed.

## 2. Test Locally

```bash
# Bundle and run locally
walkeros run flow.json --port 3000

# In another terminal — health check (provided by the runner)
curl http://localhost:3000/health
# → {"status":"ok"}

# Send a test event
curl -X POST http://localhost:3000/collect \
  -H "Content-Type: application/json" \
  -d '{"event":"page view","data":{"title":"Test"}}'
```

## 3. Create the Flow in walkerOS

Create a flow via the app UI or API, then upload the config:

```bash
# Via MCP tools or API — create flow and upload config
# The flow ID (flow_xxx) is needed for deployment
```

## 4. Deploy

```bash
# Deploy and watch progress
walkeros deploy start flow_abc123

# Output:
# Building bundle...
# Deploying container...
# Starting container...
# ✓ Active: https://your-flow.functions.fnc.fr-par.scw.cloud
```

## 5. Verify

```bash
# Health check
curl https://your-flow-url/health

# Send event
curl -X POST https://your-flow-url/collect \
  -H "Content-Type: application/json" \
  -d '{"event":"page view","data":{"title":"Production Test"}}'
```

## How It Works

```
Flow.Config JSON → CLI bundles → API stores config → Scaleway builds container
→ Container starts → Express listens on PORT → Health check passes → Active
```

**Port resolution:** The config sets `port: 8080` as default. At runtime, the
`PORT` environment variable (set by the hosting platform) overrides it
automatically — you don't need to change the config per environment.

**Platform detection:** The bundler reads `"server": {}` and generates an ESM
bundle (`bundle.mjs`) with a default export function. Web flows (`"web": {}`)
generate an IIFE (`walker.js`) instead.

## Troubleshooting

| Symptom                       | Cause                                    | Fix                                                          |
| ----------------------------- | ---------------------------------------- | ------------------------------------------------------------ |
| Health check fails            | Runner health server not starting        | Check `PORT` env var is set and not conflicting              |
| Container starts then crashes | No HTTP source configured                | Add `@walkeros/server-source-express` as source              |
| Bundle is tiny (<1KB)         | Destinations nested inside `server` key  | Move sources/destinations to flow level, alongside `server`  |
| Port mismatch                 | Config port doesn't match container PORT | Ensure config has `port: 8080` — runtime overrides it        |
| 403 on startup                | Deployer token lacks permissions         | Check deployer role on flow GET and runners heartbeat routes |

## Related

- [commands-reference.md](commands-reference.md) — Full `deploy` command
  reference
- [flow-configuration.md](flow-configuration.md) — Complete Flow.Config schema
- [SKILL.md](SKILL.md) — CLI overview
