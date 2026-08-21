<p align="left">
  <a href="https://www.walkeros.io">
    <img alt="walkerOS" title="walkerOS" src="https://www.walkeros.io/img/walkerOS_logo.svg" width="256px"/>
  </a>
</p>

# @walkeros/server-transformer-fingerprint

Server-side user identification for walkerOS without cookies. Hashes
configurable request fields into a deterministic identifier and stores it on the
event. No cookies, no PII stored: the same inputs always produce the same hash,
which gives session continuity and cross-domain stitching without a client-side
ID.

[Documentation](https://www.walkeros.io/docs/transformers/fingerprint) &bull;
[NPM Package](https://www.npmjs.com/package/@walkeros/server-transformer-fingerprint)
&bull;
[Source Code](https://github.com/elbwalker/walkerOS/tree/main/packages/server/transformers/fingerprint)

## Installation

```bash
npm install @walkeros/server-transformer-fingerprint
```

## Quick start

```typescript
import { startFlow } from '@walkeros/collector';
import { transformerFingerprint } from '@walkeros/server-transformer-fingerprint';

await startFlow({
  transformers: {
    fingerprint: {
      code: transformerFingerprint,
      config: {
        settings: {
          fields: ['ingest.ip', 'ingest.userAgent'],
          output: 'user.hash',
          length: 16,
        },
      },
    },
  },
});
```

The event then carries the hash at the configured `output` path:

```json
{ "name": "page view", "user": { "hash": "158f99cc06e33fd6" } }
```

Fields resolve from `{ event, ingest }` using walkerOS mapping. Strings use dot
notation, and function values compute dynamically. A missing field is treated as
an empty string, and the transformer never throws.

## Daily rotation

Without rotation the same IP and user agent produce the same hash indefinitely.
Add a date field to reset it each day, which limits cross-day tracking while
keeping session continuity within a day:

```typescript
settings: {
  fields: [
    'ingest.ip',
    'ingest.userAgent',
    { fn: () => new Date().toISOString().slice(0, 10) },
  ],
  output: 'user.hash',
  length: 16,
}
```

## Documentation

Full configuration, IP anonymization, and examples live in the docs:
**https://www.walkeros.io/docs/transformers/fingerprint**

## Contribute

Feel free to contribute by submitting an
[issue](https://github.com/elbwalker/walkerOS/issues), starting a
[discussion](https://github.com/elbwalker/walkerOS/discussions), or getting in
[contact](https://calendly.com/elb-alexander/30min).

## License

MIT
