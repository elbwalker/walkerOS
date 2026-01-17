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

export PROJECT_ID=playground-388912
export REGION=europe-west3
export ENDPOINT=https://walkeros-demo-589702085965.europe-west3.run.app
```

---

## Step 1: Minimal Server Flow

The simplest possible flow: receive events and log them.

```json
{
  "version": 1,
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
# Build the server bundle
npx walkeros bundle ./server.json

# Copy Dockerfile and deploy
cp Dockerfile.collect dist/Dockerfile
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
  -d '{"event":"test","data":{"step":1}}'
```

---

## Step 2: Add BigQuery Destination

Now store events in YOUR BigQuery - real data sovereignty.

Add the BigQuery destination to your flow.json:

```json
{
  "version": 1,
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
              "projectId": "playground-388912",
              "datasetId": "analytics",
              "tableId": "events",
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
# Rebuild with BigQuery destination
npx walkeros bundle ./server.json --no-cache

# Copy Dockerfile and deploy
cp Dockerfile.collect dist/Dockerfile
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
  -d '{"event":"page view","data":{"title":"Demo Page"}}'

# Query BigQuery (in GCP Console or bq CLI)
bq query --use_legacy_sql=false \
  "SELECT * FROM \`${PROJECT_ID}.analytics.events\` ORDER BY timestamp DESC LIMIT 5"
```

---

## Step 3: Add Web Flow

Now add browser-side tracking that sends to YOUR server.

Add the `web` flow to your flow.json:

```json
{
  "version": 1,
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
              "url": "https://walkeros-demo-589702085965.europe-west3.run.app/collect"
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
# Build the web bundle
npx walkeros bundle ./web.json --no-cache

# Copy Dockerfile and deploy
cp Dockerfile.serve dist/Dockerfile
gcloud run deploy walkeros-serve \
  --source ./dist \
  --region $REGION \
  --allow-unauthenticated \
  --port 8080

# Get the serve URL (this is where walker.js is hosted)
export SERVE_URL=$(gcloud run services describe walkeros-serve --region $REGION --format 'value(status.url)')
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
├── Dockerfile.collect  # Server flow (receives events)
├── Dockerfile.serve    # Web flow (hosts walker.js)
├── index.html          # Demo page
├── walker.js           # Built web bundle (after npx walkeros bundle)
├── dist/               # Build output
│   ├── bundle.mjs      # Server bundle
│   └── walker.js       # Web bundle
└── pentest/
    └── load-test.js    # k6 load test
```

---

## Quick Reference

| Variable      | Purpose                               |
| ------------- | ------------------------------------- |
| `$PROJECT_ID` | Your GCP project ID                   |
| `$REGION`     | Cloud Run region (e.g., europe-west3) |
| `$ENDPOINT`   | Your collect endpoint URL             |
| `$SERVE_URL`  | Your walker.js hosting URL            |

| Command                                     | Purpose              |
| ------------------------------------------- | -------------------- |
| `npx walkeros bundle ./server.json`         | Build server bundle  |
| `npx walkeros bundle ./web.json`            | Build web bundle     |
| `cp Dockerfile.collect dist/Dockerfile`     | Prepare collect mode |
| `cp Dockerfile.serve dist/Dockerfile`       | Prepare serve mode   |
| `gcloud run deploy SERVICE --source ./dist` | Deploy to Cloud Run  |
