<p align="left">
  <a href="https://www.walkeros.io">
    <img alt="walkerOS" title="walkerOS" src="https://www.walkeros.io/img/walkerOS_logo.svg" width="256px"/>
  </a>
</p>

# @walkeros/server-transformer-fingerprint

Cookieless, privacy-friendly visitor identification for walkerOS. Hashes the
anonymized IP, a reduced user agent and the site with a secret salt, rotates
daily, and stores the hash on the event. It sets no cookies and keeps the raw IP
off the event.

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
  // Collector chain: every event gets the hash before the destinations
  next: 'fingerprint',
  transformers: {
    fingerprint: {
      code: transformerFingerprint,
      config: {
        settings: { salt: process.env.FINGERPRINT_SALT },
      },
    },
  },
});
```

The source must extract `ip` and `userAgent` into `ingest` (its
`config.ingest`). The event then carries the hash at `user.hash`. The salt is
required: without it the hash could be reversed to the IP, so the flow does not
start. An event whose IP and user agent both resolve empty fails with
`missing-input`, since every visitor would get the same hash. An empty IP alone
still gets a hash and logs one WARN line, which the default log level does not
show.

## Documentation

Full configuration, rotation, site separation, and examples live in the docs:
**https://www.walkeros.io/docs/transformers/fingerprint**

## Contribute

Feel free to contribute by submitting an
[issue](https://github.com/elbwalker/walkerOS/issues), starting a
[discussion](https://github.com/elbwalker/walkerOS/discussions), or getting in
[contact](https://calendly.com/elb-alexander/30min).

## License

MIT
