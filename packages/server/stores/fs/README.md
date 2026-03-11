# @walkeros/server-store-fs

Local filesystem store for walkerOS server flows. Reads and writes files
relative to a base directory with path traversal protection.

[Source Code](https://github.com/elbwalker/walkerOS/tree/main/packages/server/stores/fs)
| [NPM](https://www.npmjs.com/package/@walkeros/server-store-fs) |
[Documentation](https://www.walkeros.io/docs/stores/server/fs)

## Quick start (bundled mode)

```json
{
  "version": 3,
  "flows": {
    "default": {
      "server": {},
      "stores": {
        "assets": {
          "package": "@walkeros/server-store-fs",
          "config": {
            "settings": {
              "basePath": "./public"
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

## Integrated mode

```typescript
import { startFlow } from '@walkeros/collector';
import { storeFsInit } from '@walkeros/server-store-fs';

await startFlow({
  stores: {
    assets: {
      code: storeFsInit,
      config: {
        settings: {
          basePath: './public',
        },
      },
    },
  },
});
```

## Features

- **Path traversal protection**: Rejects `..`, absolute paths, and backslash
  traversal
- **Base path scoping**: All operations restricted to the configured directory
- **Auto-create directories**: `set()` creates intermediate directories
  automatically
- **Buffer output**: `get()` returns `Buffer` for file transformer compatibility

## Installation

```bash
npm install @walkeros/server-store-fs
```

## Configuration

| Setting    | Type     | Required | Default | Description                        |
| ---------- | -------- | -------- | ------- | ---------------------------------- |
| `basePath` | `string` | Yes      | —       | Root directory for file operations |

## API

```typescript
const file = await store.get('walker.js'); // Buffer | undefined
await store.set('data.json', Buffer.from('{}')); // void
await store.delete('old-file.txt'); // void
```

## Security

All keys are validated against path traversal attacks:

- `..` segments are rejected
- Absolute paths (`/etc/passwd`) are rejected
- Backslash traversal (`..\\`) is rejected
- Resolved paths must stay within `basePath`

Rejected operations log a warning and return `undefined` (get) or no-op
(set/delete).

## Behavior notes

- **Async operations** — all methods return Promises (filesystem I/O)
- **Auto-creates directories** — `set` creates intermediate dirs via `mkdir -p`
- **Missing files** — `get` returns `undefined`, `delete` is a no-op
- **Buffer values** — `get` returns `Buffer`, `set` expects `Buffer`

## Related

- [Documentation](https://www.walkeros.io/docs/stores/server/fs)
- [Stores overview](https://www.walkeros.io/docs/stores)
- [S3 store](https://www.walkeros.io/docs/stores/server/s3) — for cloud
  deployments
