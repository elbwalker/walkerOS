# walkerOS Flow Demo

Real 1st party data collection and tag management with walkerOS. A
production-ready live demo for data ownership and sovereignty.

## Prerequisites

- Docker installed
- GCP project with BigQuery enabled
- `gcloud` CLI authenticated

## Setup

```bash
cd /workspaces/developer/walkerOS/apps/demos/flows

export PROJECT_ID=YOUR_PROJECTID
export DATASET_ID=YOUR_DATASET
export TABLE_ID=events
export REGION=YOUR_REGION
export ENDPOINT=YOUR_ENDPOINT
```

---

## Step 1: Minimal Server Flow

The simplest possible flow: receive events and log them.

```json
{
  "version": 3,
  "flows": {
    "server": {
      "server": {},
      "packages": {
        "@walkeros/collector": { "imports": ["startFlow"] },
        "@walkeros/server-source-express": {},
        "@walkeros/destination-demo": {}
      },
      "sources": {
        "express": {
          "package": "@walkeros/server-source-express",
          "code": "sourceExpress",
          "config": {
            "settings": {
              "path": "/collect",
              "port": 8080,
              "status": true
            }
          }
        }
      },
      "destinations": {
        "demo": {
          "package": "@walkeros/destination-demo",
          "code": "destinationDemo",
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

Now store events in YOUR BigQuery - real data sovereignty.

Add the BigQuery destination to your flow.json:

```json
{
  "version": 3,
  "flows": {
    "server": {
      "server": {},
      "packages": {
        "@walkeros/collector": { "imports": ["startFlow"] },
        "@walkeros/server-source-express": {},
        "@walkeros/destination-demo": {},
        "@walkeros/server-destination-gcp": {}
      },
      "sources": {
        "express": {
          "package": "@walkeros/server-source-express",
          "code": "sourceExpress",
          "config": {
            "settings": {
              "path": "/collect",
              "port": 8080,
              "status": true
            }
          }
        }
      },
      "destinations": {
        "demo": {
          "package": "@walkeros/destination-demo",
          "code": "destinationDemo",
          "config": {
            "settings": {
              "name": "server",
              "values": ["name", "data", "timestamp"]
            }
          }
        },
        "bigquery": {
          "package": "@walkeros/server-destination-gcp",
          "code": "destinationBigQuery",
          "config": {
            "settings": {
              "projectId": "$PROJECT_ID",
              "datasetId": "$DATASET_ID",
              "tableId": "$TABLE_ID",
              "location": "EU"
            }
          }
        }
      }
    }
  }
}
```

**What changed:**

- Added `@walkeros/server-destination-gcp` package
- Added `bigquery` destination with your GCP project details

### Deploy Step 2

```bash
# Rebuild with the BigQuery destination
npx walkeros bundle ./server.json -o dist/ --no-cache
sed "s/^ARG WALKEROS_VERSION$/ARG WALKEROS_VERSION=$(npx walkeros --version)/" \
  Dockerfile.collect > dist/Dockerfile

# Deploy to Cloud Run
gcloud run deploy walkeros-demo \
  --source ./dist \
  --region $REGION \
  --allow-unauthenticated \
  --port 8080
```

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

Now add browser-side tracking that sends to YOUR server.

Add the `web` flow to your flow.json:

```json
{
  "version": 3,
  "flows": {
    "server": {
      // ... same as Step 2
    },
    "web": {
      "web": {
        "windowCollector": "collector",
        "windowElb": "elb"
      },
      "packages": {
        "@walkeros/collector": { "imports": ["startFlow"] },
        "@walkeros/web-source-browser": {},
        "@walkeros/destination-demo": {},
        "@walkeros/web-destination-api": {},
        "@walkeros/web-destination-gtag": {}
      },
      "sources": {
        "browser": {
          "package": "@walkeros/web-source-browser",
          "code": "sourceBrowser",
          "config": {
            "settings": {
              "pageview": true,
              "session": true
            }
          }
        }
      },
      "destinations": {
        "demo": {
          "package": "@walkeros/destination-demo",
          "code": "destinationDemo",
          "config": {
            "settings": {
              "name": "console",
              "values": ["name", "data", "context", "timestamp"]
            }
          }
        },
        "api": {
          "package": "@walkeros/web-destination-api",
          "code": "destinationAPI",
          "config": {
            "settings": {
              "url": "$ENDPOINT/collect"
            }
          }
        },
        "ga4": {
          "package": "@walkeros/web-destination-gtag",
          "code": "destinationGtag",
          "config": {
            "loadScript": true,
            "settings": {
              "ga4": {
                "measurementId": "G-XXXXXXXXXX"
              }
            }
          }
        }
      },
      "collector": {
        "run": true
      }
    }
  }
}
```

**What this adds:**

- Browser source captures page views and sessions
- Demo destination logs to browser console
- API destination sends to YOUR Cloud Run endpoint
- GA4 destination sends to Google Analytics (optional)

### Deploy Step 3

```bash
# Build the web bundle: a single walker.js
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

---

### What to Show

1. **Click buttons** - See events in the visual console
2. **Open Network tab** - Events go to YOUR endpoint, not google-analytics.com
3. **Open BigQuery** - Events arrive in your database
4. **Browser console** - `elb('custom event', { data: 'here' })`

---

## Step 4: Load Test

Prove it's production-ready.

```bash
cd pentest

# Run load test with 200 concurrent users
docker run --rm -v $(pwd):/scripts grafana/k6 run \
  --vus 200 --duration 2m --no-color \
  /scripts/load-test.js

# Heavy load: 500 users
docker run --rm -v $(pwd):/scripts grafana/k6 run \
  --vus 500 --duration 2m --no-color \
  /scripts/load-test.js
```

**Expected Results:**

- 300-500 req/s throughput
- 0% HTTP failures
- Cloud Run scales automatically

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
| `$ENDPOINT`   | Your collect endpoint URL              |
| `$SERVE_URL`  | Your walker.js hosting URL             |
| `$BUCKET`     | Cloud Storage bucket hosting walker.js |

| Command                                       | Purpose                       |
| --------------------------------------------- | ----------------------------- |
| `npx walkeros bundle ./server.json -o dist/`  | Build the server artifact dir |
| `npx walkeros bundle ./web.json -o dist/web/` | Build walker.js               |
| `gcloud run deploy SERVICE --source ./dist`   | Deploy to Cloud Run           |
