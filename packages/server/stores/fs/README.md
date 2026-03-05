# @walkeros/server-store-fs

Filesystem store for walkerOS server flows. Reads and writes files via the
walkerOS Store interface, making it interchangeable with MemoryStore, S3Store,
or any other Store implementation.

## Installation

```bash
npm install @walkeros/server-store-fs
```

## Usage

```typescript
import { storeFsInit } from '@walkeros/server-store-fs';

const store = storeFsInit({
  collector,
  logger,
  config: { settings: { basePath: './public' } },
  env: {},
  id: 'fs',
});

const content = await store.get('js/walker.js'); // Buffer | undefined
await store.set('output.txt', Buffer.from('hello'));
await store.delete('output.txt');
```

## Settings

| Option     | Type     | Description                                             |
| ---------- | -------- | ------------------------------------------------------- |
| `basePath` | `string` | Root directory. All keys are resolved relative to this. |

## Security

All keys are validated against path traversal attacks:

- `..` segments are rejected
- Absolute paths (`/etc/passwd`) are rejected
- Backslash traversal (`..\\`) is rejected
- Resolved paths must stay within `basePath`

Rejected operations log a warning and return `undefined` (get) or no-op
(set/delete).

## Behavior notes

- **Async operations** - all methods return Promises (filesystem I/O)
- **Auto-creates directories** - `set` creates intermediate dirs via `mkdir -p`
- **Missing files** - `get` returns `undefined`, `delete` is a no-op
- **Buffer values** - `get` returns `Buffer`, `set` expects `Buffer`
