# Server Flow Deployment Guide

End-to-end guide for creating, testing, and deploying a server-side event
collection flow.

## Prerequisites

- walkerOS CLI installed: `npm install -g @walkeros/cli`
- A walkerOS project (create at app.walkeros.io or via API)
- Authentication: `walkeros auth login`, or `WALKEROS_TOKEN` set to an
  automation token (`wos_pat_...`) from Account, Automation tokens
- `WALKEROS_PROJECT_ID` set, or `--project` on every `walkeros api` call

## 1. Create the Flow Config

Server flows use `"platform": "server"` instead of `"platform": "web"`. A
minimal server flow needs an HTTP source (Express) for health checks and event
collection:

```json
{
  "version": 4,
  "flows": {
    "default": {
      "config": {
        "platform": "server",
        "bundle": {
          "packages": {
            "@walkeros/server-source-express": {},
            "@walkeros/destination-demo": {}
          }
        }
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

| Setting | Required    | Purpose                                                                                                                               |
| ------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `port`  | Yes         | HTTP server port. Set to `8080`. Under `runneros` the runtime owns the port (`PORT`, default 8080) and routes requests to the source. |
| `cors`  | Recommended | Enable CORS for cross-origin event collection                                                                                         |

> **Note:** Health check endpoints (`/health`, `/ready`) are provided by the
> runtime (`runneros`), not by sources. No source-level health configuration is
> needed.

## 2. Test Locally

```bash
# Bundle, then start the artifact with the runtime
walkeros bundle flow.json -o dist/
npx --package=@walkeros/runner runneros start dist/flow.mjs --port 3000

# In another terminal, health check (provided by the runtime)
curl http://localhost:3000/health
# → {"status":"ok"}

# Send a test event
curl -X POST http://localhost:3000/collect \
  -H "Content-Type: application/json" \
  -d '{"event":"page view","data":{"title":"Test"}}'
```

## 3. Create the Flow in walkerOS

Create the flow in the app UI, or send a flow record that names `name` and
`config` with `walkeros api`. The answer carries the flow ID (`flow_...`) the
deploy needs:

```bash
# Wrap flow.json into a flow record
jq -n --slurpfile config flow.json '{ name: "my-server-flow", config: $config[0] }' > flow-record.json

walkeros api POST /api/projects/{projectId}/flows --data @flow-record.json | jq -r .id
# flow_abc123
```

## 4. Deploy

Start the deploy, then read the deployment until its status is `active` (a
server flow) or `failed`:

```bash
DEPLOYMENT=$(walkeros api POST /api/projects/{projectId}/flows/flow_abc123/deploy | jq -r .deploymentId)

walkeros api GET /api/projects/{projectId}/deployments/$DEPLOYMENT | jq '{ status, url, error }'
```

`url` is the live endpoint once the status is `active`. For a CI job that waits
for the result, see "Deploy from CI" in the
[CLI docs](https://www.walkeros.io/docs/apps/cli#deploy-from-ci).

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
Flow.Json JSON → CLI bundles → API stores config → Scaleway builds container
→ Container starts → Express listens on PORT → Health check passes → Active
```

**Port resolution:** The config sets `port: 8080` as default. At runtime, the
`PORT` environment variable (set by the hosting platform) overrides it
automatically. You don't need to change the config per environment.

**Platform detection:** The bundler reads `config.platform: "server"` and emits
an ESM `flow.mjs` plus a `node_modules/` traced by `@vercel/nft`, all inside
`dist/`. Web flows (`config.platform: "web"`) emit a single self-contained IIFE
(`dist/walker.js`) instead.

## Troubleshooting

| Symptom                       | Cause                                    | Fix                                                          |
| ----------------------------- | ---------------------------------------- | ------------------------------------------------------------ |
| Health check fails            | Runner health server not starting        | Check `PORT` env var is set and not conflicting              |
| Container starts then crashes | No HTTP source configured                | Add `@walkeros/server-source-express` as source              |
| Bundle is tiny (<1KB)         | Destinations nested inside `server` key  | Move sources/destinations to flow level, alongside `server`  |
| Port mismatch                 | Config port doesn't match container PORT | Ensure config has `port: 8080` — runtime overrides it        |
| 403 on startup                | Deployer token lacks permissions         | Check deployer role on flow GET and runners heartbeat routes |

## Related

- [commands-reference.md](commands-reference.md): the `api` command reference
- [flow-configuration.md](flow-configuration.md): the complete Flow.Json schema
- [SKILL.md](SKILL.md): the CLI overview
