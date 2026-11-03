# Server Flow Deployment Guide

End-to-end guide for creating, testing, and deploying a server-side event
collection flow.

## Prerequisites

- walkerOS CLI installed: `npm install -g @walkeros/cli`
- A walkerOS project (create at app.walkeros.io or via API)
- Authentication: `WALKEROS_TOKEN` set to a token (`wos_pat_...`) from Account >
  Automation tokens
- `WALKEROS_PROJECT_ID` set, or `--project` on every `walkeros api` call

## 1. Create the Flow Config

Server flows use `"platform": "server"` instead of `"platform": "web"`. A
minimal server flow needs an HTTP source (Express) for event collection:

```json
{
  "version": 4,
  "flows": {
    "default": {
      "config": {
        "platform": "server",
        "bundle": {
          "packages": {
            "@walkeros/server-source-express": { "version": "^4" },
            "@walkeros/destination-demo": { "version": "^4" }
          }
        }
      },
      "sources": {
        "http": {
          "package": "@walkeros/server-source-express",
          "config": {
            "settings": {
              "cors": true
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

| Setting | Required | Purpose                                                                                                                                                            |
| ------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `cors`  | No       | CORS for cross-origin event collection (default `true`)                                                                                                            |
| `port`  | No       | Port of a standalone server. Under `runneros` the runtime owns the port (`PORT`, default 8080) and routes requests to the source, so the setting is not used there |

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
  -d '{"name":"page view","data":{"title":"Test"}}'
# → {"success":true,"timestamp":...}
```

The express source answers a POST before the event is delivered, so
`{"success":true}` only says the request was accepted. The runtime's log shows
what arrived; here the demo destination prints the event. A body without `name`
gets the same answer and is rejected as invalid (`Event name is required`).

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
  -d '{"name":"page view","data":{"title":"Production Test"}}'
```

## How It Works

```
flow.json → walkeros api stores the config → the app bundles the flow and
starts it on the walkeros/flow image → runneros listens on PORT → /ready
answers 200 → active
```

**Port resolution:** under `runneros` the runtime listens on `PORT` (set by the
hosting platform, default 8080) and hands every request except `/health` and
`/ready` to the source. The source's own `port` setting is not used, so the
config needs no change per environment.

**Platform detection:** The bundler reads `config.platform: "server"` and emits
an ESM `flow.mjs` plus a `node_modules/` traced by `@vercel/nft`, all inside
`dist/`. Web flows (`config.platform: "web"`) emit a single self-contained IIFE
(`dist/walker.js`) instead.

## Troubleshooting

| Symptom                             | Cause                                                                                                                               | Fix                                                                                                        |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Health check fails                  | Runner health server not starting                                                                                                   | Check `PORT` env var is set and not conflicting                                                            |
| `/health` is 200, events answer 503 | No HTTP source configured: the runtime answers every other path `{"error":"No flow loaded"}`                                        | Add `@walkeros/server-source-express` as source                                                            |
| Steps missing from the running flow | Steps nested under a key the flow schema does not know, such as a `server` block: validate and the bundle drop it without a message | Put `sources`, `destinations` and the other step maps directly under the flow, next to `config`            |
| 403 on startup                      | The runtime was started with a person's token, or its deploy token was regenerated or revoked                                       | Use the current deploy token from the flow's self-hosted settings; runner routes accept runner tokens only |

## Related

- [commands-reference.md](commands-reference.md): the `api` command reference
- [flow-configuration.md](flow-configuration.md): the complete Flow.Json schema
- [SKILL.md](SKILL.md): the CLI overview
