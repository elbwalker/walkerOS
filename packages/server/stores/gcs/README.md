# @walkeros/server-store-gcs

Google Cloud Storage for walkerOS server flows.

Zero runtime dependencies — uses raw `fetch` against the GCS JSON API with
built-in auth (ADC on Cloud Run / service account JWT elsewhere).

## Quick Start (Bundled Mode)

```json
{
  "version": 3,
  "flows": {
    "default": {
      "server": {},
      "stores": {
        "assets": {
          "package": "@walkeros/server-store-gcs",
          "config": {
            "settings": {
              "bucket": "my-assets",
              "prefix": "public"
            }
          }
        }
      },
      "transformers": {
        "file": {
          "package": "@walkeros/server-transformer-file",
          "config": { "settings": { "prefix": "/static" } },
          "env": { "store": "$store.assets" }
        }
      }
    }
  }
}
```

## Integrated Mode

```typescript
import { storeGcsInit } from '@walkeros/server-store-gcs';

const store = await storeGcsInit({
  collector,
  logger,
  id: 'assets',
  config: {
    settings: {
      bucket: 'my-assets',
      prefix: 'public',
      // Omit credentials for ADC on Cloud Run/GKE
      // Or pass SA JSON: credentials: process.env.GCS_SA_KEY
    },
  },
  env: {},
});

const file = await store.get('walker.js'); // Buffer | undefined
await store.set('cache/data.json', Buffer.from('{}'));
await store.delete('old-file.txt');
```

## Configuration

| Setting       | Type               | Required | Default | Description                    |
| ------------- | ------------------ | -------- | ------- | ------------------------------ |
| `bucket`      | `string`           | Yes      | —       | GCS bucket name                |
| `prefix`      | `string`           | No       | —       | Key prefix for scoping         |
| `credentials` | `string \| object` | No       | ADC     | Service account JSON or string |

## Authentication

### Cloud Run / GKE (ADC)

When running on GCP infrastructure, omit `credentials`. The store fetches tokens
from the metadata server automatically.

### Non-GCP (Service Account)

Pass a service account JSON as a string (from `$env.GCS_SA_KEY`) or as an object
with `client_email` and `private_key` fields. The store signs JWTs locally and
exchanges them for access tokens.

```json
{
  "credentials": "$env.GCS_SA_KEY"
}
```

## Security

- **Key validation**: Path traversal attempts (`..`, absolute paths) are
  rejected
- **Prefix scoping**: The `prefix` setting restricts all operations to a
  subdirectory
- **Token caching**: Access tokens are cached and refreshed automatically

## API

```typescript
const file = await store.get('walker.js'); // Buffer | undefined
await store.set('data.json', Buffer.from('{}')); // void
await store.delete('old-file.txt'); // void
```

`get()` returns `Buffer` for compatibility with the file transformer.
