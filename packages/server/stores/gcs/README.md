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
| `bucket`      | `string`           | Yes      | (none)  | GCS bucket name                |
| `prefix`      | `string`           | No       | (none)  | Key prefix for scoping         |
| `credentials` | `string \| object` | No       | ADC     | Service account JSON or string |

## Provisioning

The package ships an idempotent `setup()` lifecycle that creates the GCS bucket
described in flow config. It is invoked only by the explicit operator command:

```bash
walkeros setup store.<id>
```

It never runs automatically and never alters an existing bucket.

### `Setup` options

| Option         | Type                                                  | Default      | Notes                                                          |
| -------------- | ----------------------------------------------------- | ------------ | -------------------------------------------------------------- |
| `projectId`    | `string`                                              | (resolved)   | GCP project that owns the bucket. Resolution order below.      |
| `location`     | `string`                                              | `'EU'`       | Multi-region or regional location.                             |
| `storageClass` | `'STANDARD' \| 'NEARLINE' \| 'COLDLINE' \| 'ARCHIVE'` | `'STANDARD'` | Default object storage class.                                  |
| `versioning`   | `boolean`                                             | `false`      | Object versioning. Off by default; opt in.                     |
| `lifecycle`    | `{ rule: unknown[] }`                                 | (none)       | Applied at create. Drift detection NOT included for lifecycle. |
| `kmsKeyName`   | `string`                                              | (none)       | Customer-managed encryption key (CMEK) at create time.         |
| `labels`       | `Record<string, string>`                              | (none)       | Cost-allocation labels.                                        |

`bucket` is taken from `settings.bucket` and is NOT duplicated under `setup`.

### `projectId` resolution

The GCS create call requires a project. Resolution order:

1. Explicit `setup.projectId`.
2. `project_id` field inside the `settings.credentials` service-account JSON.
3. `process.env.GOOGLE_CLOUD_PROJECT` (Cloud Run / GKE convention).
4. Throws with an actionable error if none of the above is available.

### Behavior

- **Idempotent**: HTTP 409 (bucket exists) is treated as success. The setup
  never patches or mutates an existing bucket.
- **Drift detection**: when the bucket already exists, setup performs a
  `GET /b/<bucket>` and logs `WARN setup.drift { field, declared, actual }` for
  any of `location`, `storageClass`, `versioning`, `iamConfiguration` (uniform
  bucket-level access, public access prevention), and `labels` that do not
  match. Drift is logged, never auto-fixed.
- **Defaults enforced at create**: uniform bucket-level access on, public access
  prevention enforced. These are baked in by the package.

### Runtime hard-fail

At runtime, the first `get` / `set` / `delete` call issues a single
`HEAD /b/<bucket>` per process per bucket. On 404, it throws with an actionable
message:

```
GCS bucket not found: <bucket> in project <projectId>. Run "walkeros setup store.<id>" to create it.
```

Operators see the error pointing at the exact command to fix it. Subsequent
operations in the same process skip the check via an in-memory cache.

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
