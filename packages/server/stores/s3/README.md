# @walkeros/server-store-s3

S3-compatible object storage for walkerOS server flows.

Works with AWS S3, Cloudflare R2, Scaleway, DigitalOcean Spaces, Backblaze B2,
MinIO, and any S3-compatible provider. Uses
[s3mini](https://github.com/good-lly/s3mini) (~20 KB, zero dependencies).

## Quick Start (Bundled Mode)

```json
{
  "version": 3,
  "flows": {
    "default": {
      "server": {},
      "stores": {
        "assets": {
          "package": "@walkeros/server-store-s3",
          "config": {
            "settings": {
              "bucket": "my-assets",
              "endpoint": "https://s3.eu-west-1.amazonaws.com",
              "accessKeyId": "$env.S3_ACCESS_KEY",
              "secretAccessKey": "$env.S3_SECRET_KEY",
              "region": "eu-west-1",
              "prefix": "public"
            }
          }
        }
      },
      "transformers": {
        "file": {
          "package": "@walkeros/server-transformer-file",
          "config": { "settings": { "prefix": "/static" } },
          "env": { "store": "$store:assets" }
        }
      }
    }
  }
}
```

## Integrated Mode

```typescript
import { storeS3Init } from '@walkeros/server-store-s3';

const store = await storeS3Init({
  collector,
  logger,
  id: 'assets',
  config: {
    settings: {
      bucket: 'my-assets',
      endpoint: 'https://s3.eu-west-1.amazonaws.com',
      accessKeyId: process.env.S3_ACCESS_KEY!,
      secretAccessKey: process.env.S3_SECRET_KEY!,
      region: 'eu-west-1',
      prefix: 'public',
    },
  },
  env: {},
});

const file = await store.get('walker.js'); // Buffer | undefined
await store.set('cache/data.json', Buffer.from('{}'));
await store.delete('old-file.txt');
```

## Configuration

| Setting           | Type     | Required | Default  | Description                |
| ----------------- | -------- | -------- | -------- | -------------------------- |
| `bucket`          | `string` | Yes      | —        | S3 bucket name             |
| `endpoint`        | `string` | Yes      | —        | S3-compatible endpoint URL |
| `accessKeyId`     | `string` | Yes      | —        | S3 access key ID           |
| `secretAccessKey` | `string` | Yes      | —        | S3 secret access key       |
| `region`          | `string` | No       | `"auto"` | AWS region (SigV4 signing) |
| `prefix`          | `string` | No       | —        | Key prefix for scoping     |

## Provider Examples

| Provider      | Endpoint                                     | Notes            |
| ------------- | -------------------------------------------- | ---------------- |
| AWS S3        | `https://s3.<region>.amazonaws.com`          | Standard         |
| Cloudflare R2 | `https://<account>.r2.cloudflarestorage.com` | No egress fees   |
| Scaleway      | `https://s3.<region>.scw.cloud`              | EU hosting       |
| DigitalOcean  | `https://<region>.digitaloceanspaces.com`    | Simple pricing   |
| Backblaze B2  | `https://s3.<region>.backblazeb2.com`        | Cheapest storage |
| MinIO         | `http://localhost:9000`                      | Self-hosted      |

## Credentials

Use `$env.` references in Flow.Config to avoid hardcoding secrets:

```json
{
  "accessKeyId": "$env.S3_ACCESS_KEY",
  "secretAccessKey": "$env.S3_SECRET_KEY"
}
```

Unlike the AWS SDK, `s3mini` has no implicit credential chain — `accessKeyId`
and `secretAccessKey` are always required.

## Managed Deployments (Mode D)

This is the recommended store for managed walkerOS deployments. Files live in a
bucket rather than needing to be baked into a Docker image, enabling hot-swap of
static assets.
