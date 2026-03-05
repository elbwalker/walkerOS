# @walkeros/server-transformer-cache

HTTP response cache transformer for walkerOS server flows. Sits before a
responder in the transformer chain and serves cached responses on HIT, or wraps
the respond function to intercept and cache responses on MISS.

## How it works

1. **MISS** — No cached entry. Returns `{ respond: wrappedFn }` so the collector
   replaces the respond function for downstream transformers. When downstream
   calls respond, the wrapper caches the response and forwards it with an
   `X-Cache: MISS` header.

2. **HIT** — Cached entry found. Calls `env.respond` directly with the stored
   response plus `X-Cache: HIT` header, then returns `false` to stop the chain.

3. **No match** — If no rule matches the ingest, the event passes through
   unchanged.

## Installation

```bash
npm install @walkeros/server-transformer-cache
```

## Configuration

### Settings

| Field     | Type          | Default | Description                      |
| --------- | ------------- | ------- | -------------------------------- |
| `rules`   | `CacheRule[]` | —       | Cache rules (first match wins)   |
| `maxSize` | `number`      | 10 MB   | Max in-memory store size (bytes) |

### CacheRule

| Field     | Type                           | Description                               |
| --------- | ------------------------------ | ----------------------------------------- |
| `match`   | `Matcher.MatchExpression │'*'` | Condition matched against ingest fields   |
| `key`     | `string[]`                     | Ingest fields used to build the cache key |
| `ttl`     | `number`                       | Time-to-live in seconds                   |
| `headers` | `Record<string, string>`       | Extra headers merged into every response  |

### Example

```typescript
import { transformerCache } from '@walkeros/server-transformer-cache';

const config = {
  settings: {
    maxSize: 5 * 1024 * 1024, // 5 MB
    rules: [
      {
        match: { key: 'method', operator: 'eq', value: 'GET' },
        key: ['method', 'path'],
        ttl: 300,
        headers: { 'Cache-Control': 'public, max-age=300' },
      },
    ],
  },
};
```

## Behavior notes

- **LRU eviction** — when the store exceeds `maxSize`, the least-recently-used
  entries are evicted first.
- **Lazy TTL** — expired entries are removed on the next `get`, not on a timer.
- **First match wins** — rules are evaluated in order; only the first matching
  rule is applied.
- **Empty key warning** — if all key fields resolve to empty strings, the event
  passes through with a warning log.
- **No env.respond** — if the source didn't provide a respond function, the MISS
  wrapper still caches the response (useful for pre-warming).
