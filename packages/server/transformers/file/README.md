# @walkeros/server-transformer-file

File serving transformer for walkerOS server flows. Serves static files through
any Store backend, making it I/O-agnostic. Works with FsStore for disk,
MemoryStore for pre-loaded assets, or any custom Store implementation.

## How it works

1. Extracts `ingest.path` from the request
2. Strips optional URL prefix (e.g., `/static`)
3. Calls `store.get(filePath)` to fetch content
4. Responds with content, correct Content-Type, and Content-Length
5. Returns `false` to stop the transformer chain

If the file is not found or no store is provided, the event passes through
unchanged.

## Installation

```bash
npm install @walkeros/server-transformer-file
```

## Configuration

### Settings

| Option      | Type                     | Default | Description                         |
| ----------- | ------------------------ | ------- | ----------------------------------- |
| `prefix`    | `string`                 | —       | URL prefix to strip before lookup   |
| `headers`   | `Record<string, string>` | —       | Default headers for all responses   |
| `mimeTypes` | `Record<string, string>` | —       | Extension overrides (`.ext` → type) |

### Env

| Option  | Type        | Description                                         |
| ------- | ----------- | --------------------------------------------------- |
| `store` | `FileStore` | Store providing file content (required for serving) |

### Example with FsStore

```typescript
import { startFlow } from '@walkeros/collector';
import { transformerFile } from '@walkeros/server-transformer-file';
import { storeFsInit } from '@walkeros/server-store-fs';

const fileStore = storeFsInit({
  collector,
  logger,
  config: { settings: { basePath: './public' } },
  env: {},
  id: 'fs',
});

await startFlow({
  transformers: {
    file: {
      code: transformerFile,
      config: {
        settings: {
          prefix: '/static',
          headers: { 'Cache-Control': 'public, max-age=3600' },
        },
      },
      env: { store: fileStore },
    },
  },
});
```

## Built-in MIME types

`.js`, `.mjs`, `.css`, `.html`, `.json`, `.wasm`, `.map`, `.txt`, `.xml`,
`.svg`, `.png`, `.jpg`, `.gif`, `.ico`, `.webp`, `.woff`, `.woff2`

Unknown extensions default to `application/octet-stream`. Override with the
`mimeTypes` setting.

## Behavior notes

- **I/O-agnostic** — delegates all storage to the injected Store
- **No store = passthrough** — warns and lets the event continue
- **No path = passthrough** — skips when `ingest.path` is missing
- **Prefix mismatch = passthrough** — only serves paths matching the prefix
- **Stops chain on serve** — returns `false` after responding
