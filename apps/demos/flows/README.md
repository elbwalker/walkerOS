# walkerOS Flow Demo

First-party data collection and tag management with walkerOS, as a live demo
that you deploy to your own Google Cloud project.

## Prerequisites

- Docker installed
- GCP project with BigQuery enabled
- `gcloud` CLI authenticated

## Setup

```bash
# from the repository root
cd apps/demos/flows

export PROJECT_ID=YOUR_PROJECTID
export DATASET_ID=YOUR_DATASET
export TABLE_ID=events
export REGION=YOUR_REGION
export ENDPOINT=YOUR_ENDPOINT
```

---

## Step 1: Minimal Server Flow

The simplest possible flow, saved as `server.json`: receive events and log them.

```json
{
  "version": 4,
  "flows": {
    "server": {
      "config": { "platform": "server" },
      "sources": {
        "express": {
          "package": "@walkeros/server-source-express",
          "import": "sourceExpress",
          "config": {
            "settings": {
              "paths": ["/collect"],
              "port": 8080
            }
          }
        }
      },
      "destinations": {
        "demo": {
          "package": "@walkeros/destination-demo",
          "import": "destinationDemo",
          "config": {
            "settings": {
              "name": "server",
              "values": ["name", "data", "timestamp"]
            }
          }
        }
      }
    }
  }
}
```

**What this does:**

- Express source listens on `/collect` port 8080
- Demo destination logs events to console

### Deploy Step 1

```bash
# Build the server artifact directory, then add a Dockerfile pinned to the
# same version as the CLI that built it
npx walkeros bundle ./server.json -o dist/
sed "s/^ARG WALKEROS_VERSION$/ARG WALKEROS_VERSION=$(npx walkeros --version)/" \
  Dockerfile.collect > dist/Dockerfile

# Deploy to Cloud Run
gcloud run deploy walkeros-demo \
  --source ./dist \
  --region $REGION \
  --allow-unauthenticated \
  --port 8080
```

### Test Step 1

```bash
# Get your endpoint URL
export ENDPOINT=$(gcloud run services describe walkeros-demo --region $REGION --format 'value(status.url)')

# Send a test event
curl -X POST $ENDPOINT/collect \
  -H "Content-Type: application/json" \
  -d '{"name":"hey there","data":{"step":1}}'
```

---

## Step 2: Add BigQuery Destination

Now store events in your own BigQuery.

Add the BigQuery destination to `server.json`:

```json
{
  "version": 4,
  "flows": {
    "server": {
      "config": { "platform": "server" },
      "sources": {
        "express": {
          "package": "@walkeros/server-source-express",
          "import": "sourceExpress",
          "config": {
            "settings": {
              "paths": ["/collect"],
              "port": 8080
            }
          }
        }
      },
      "destinations": {
        "demo": {
          "package": "@walkeros/destination-demo",
          "import": "destinationDemo",
          "config": {
            "settings": {
              "name": "server",
              "values": ["name", "data", "timestamp"]
            }
          }
        },
        "bigquery": {
          "package": "@walkeros/server-destination-gcp",
          "import": "destinationBigQuery",
          "config": {
            "setup": { "location": "EU" },
            "settings": {
              "projectId": "$env.PROJECT_ID",
              "datasetId": "$env.DATASET_ID",
              "tableId": "$env.TABLE_ID"
            }
          }
        }
      }
    }
  }
}
```

**What changed:**

- Added the `bigquery` destination of `@walkeros/server-destination-gcp` with
  your GCP project details
- `$env.PROJECT_ID`, `$env.DATASET_ID` and `$env.TABLE_ID` are read from the
  environment when the flow runs
- `"setup"` lets `walkeros setup` create the table and the dataset, in the
  region that `location` names (default `EU`)

### Deploy Step 2

```bash
# Create the dataset and table once. The BigQuery client reads Application
# Default Credentials: run `gcloud auth application-default login` first
npx walkeros setup destination.bigquery -c ./server.json

# Rebuild with the BigQuery destination
npx walkeros bundle ./server.json -o dist/ --no-cache
sed "s/^ARG WALKEROS_VERSION$/ARG WALKEROS_VERSION=$(npx walkeros --version)/" \
  Dockerfile.collect > dist/Dockerfile

# Deploy to Cloud Run, with the values the $env references read
gcloud run deploy walkeros-demo \
  --source ./dist \
  --region $REGION \
  --allow-unauthenticated \
  --port 8080 \
  --set-env-vars PROJECT_ID=$PROJECT_ID,DATASET_ID=$DATASET_ID,TABLE_ID=$TABLE_ID
```

The flow sets no `config.credentials`, so the service writes the rows with
Application Default Credentials, which on Cloud Run are the service's runtime
service account. Give that account the runtime role listed under
[Create service accounts](https://www.walkeros.io/docs/destinations/server/gcp#create-service-accounts),
or deploy with `--service-account`.

### Verify in BigQuery

```bash
# Send test event
curl -X POST $ENDPOINT/collect \
  -H "Content-Type: application/json" \
  -d '{"name":"page view","data":{"title":"Demo Page"}}'

# Query BigQuery (in GCP Console or bq CLI)
bq query --use_legacy_sql=false \
  "SELECT * FROM \`${PROJECT_ID}.${DATASET_ID}.${TABLE_ID}\` ORDER BY timestamp DESC LIMIT 5"
```

---

## Step 3: Add Web Flow

Now add browser-side tracking that sends to your server.

Save the web flow as `web.json`:

```json
{
  "version": 4,
  "flows": {
    "web": {
      "config": { "platform": "web" },
      "sources": {
        "browser": {
          "package": "@walkeros/web-source-browser",
          "import": "sourceBrowser",
          "config": {
            "settings": {
              "pageview": true
            }
          }
        }
      },
      "destinations": {
        "demo": {
          "package": "@walkeros/destination-demo",
          "import": "destinationDemo",
          "config": {
            "settings": {
              "name": "console",
              "values": ["name", "data", "context", "timestamp"]
            }
          }
        },
        "api": {
          "package": "@walkeros/web-destination-api",
          "import": "destinationAPI",
          "config": {
            "settings": {
              "url": "$env.ENDPOINT/collect"
            },
            "mapping": {
              "batch": {
                "me": {
                  "batch": 100
                }
              }
            }
          }
        },
        "ga4": {
          "package": "@walkeros/web-destination-gtag",
          "import": "destinationGtag",
          "config": {
            "loadScript": true,
            "settings": {
              "ga4": {
                "measurementId": "G-XXXXXXXXXX",
                "pageview": false
              }
            }
          }
        }
      }
    }
  }
}
```

**What this adds:**

- Browser source captures page views and tagged DOM events
- Demo destination logs to browser console
- API destination sends to your Cloud Run endpoint, read from `$ENDPOINT` when
  you bundle; the `batch me` events of the demo page's batch boxes go in batches
- GA4 destination sends to Google Analytics (optional); `"pageview": false`
  leaves the page view to the browser source, so GA4 counts it once

### Deploy Step 3

```bash
# Build the web bundle: a single walker.js ($ENDPOINT must be set)
npx walkeros bundle ./web.json -o dist/web/ --no-cache

# Host it on any static host, e.g. a public Cloud Storage bucket
export BUCKET=walkeros-demo-$PROJECT_ID
gcloud storage buckets create gs://$BUCKET --location=$REGION
gcloud storage cp dist/web/walker.js gs://$BUCKET/walker.js
gcloud storage buckets add-iam-policy-binding gs://$BUCKET \
  --member=allUsers --role=roles/storage.objectViewer

# This is where walker.js is hosted
export SERVE_URL=https://storage.googleapis.com/$BUCKET
echo "walker.js available at: $SERVE_URL/walker.js"
```

Point the walker.js `<script>` at the end of `index.html` to
`$SERVE_URL/walker.js`, then open the page.

---

### What to Show

1. Click the buttons and watch the events in the visual console.
2. In the Network tab, the events go to your endpoint (and, with the GA4
   destination, to Google Analytics).
3. In BigQuery, the events arrive in your database.
4. In the browser console, run
   `elb({ name: 'custom event', data: { label: 'here' } })`.

---

## Step 4: Load Test

Load test the server flow with k6. Pass your service's URL with `-e ENDPOINT`:
without it, `load-test.js` stops with `ENDPOINT is not set` before it sends a
request.

```bash
cd pentest

# Run load test with 200 concurrent users
docker run --rm -v $(pwd):/scripts grafana/k6 run \
  -e ENDPOINT=$ENDPOINT/collect \
  --vus 200 --duration 2m --no-color \
  /scripts/load-test.js

# Heavy load: 500 users
docker run --rm -v $(pwd):/scripts grafana/k6 run \
  -e ENDPOINT=$ENDPOINT/collect \
  --vus 500 --duration 2m --no-color \
  /scripts/load-test.js
```

`load-test.js` sets two thresholds: 95% of requests answer within 2 seconds, and
fewer than 5% answer with a status other than 200.

---

## File Structure

```
flows/
├── README.md           # This file
├── server.json         # Server flow configuration
├── web.json            # Web flow configuration
├── Dockerfile.collect  # Server Dockerfile, copied into dist/ with the CLI version
├── index.html          # Demo page
├── dist/               # Build output (generated by CLI)
│   ├── flow.mjs        # Server entry
│   ├── package.json    # Server sidecar
│   ├── node_modules/   # Traced server dependencies
│   ├── Dockerfile      # From Dockerfile.collect
│   └── web/walker.js   # Web bundle
└── pentest/
    └── load-test.js    # k6 load test
```

> **Note:** The CLI builds; the `walkeros/flow` image runs the built `dist/`
> directory with `runneros`. It cannot bundle a `flow.json` itself.

---

## Quick Reference

| Variable      | Purpose                                |
| ------------- | -------------------------------------- |
| `$PROJECT_ID` | Your GCP project ID                    |
| `$DATASET_ID` | Your BigQuery dataset                  |
| `$TABLE_ID`   | Your BigQuery table (default: events)  |
| `$REGION`     | Cloud Run region (e.g., europe-west3)  |
| `$ENDPOINT`   | Your Cloud Run service URL             |
| `$SERVE_URL`  | Your walker.js hosting URL             |
| `$BUCKET`     | Cloud Storage bucket hosting walker.js |

| Command                                       | Purpose                       |
| --------------------------------------------- | ----------------------------- |
| `npx walkeros bundle ./server.json -o dist/`  | Build the server artifact dir |
| `npx walkeros bundle ./web.json -o dist/web/` | Build walker.js               |
| `gcloud run deploy SERVICE --source ./dist`   | Deploy to Cloud Run           |
