<p align="left">
  <a href="https://www.walkeros.io">
    <img alt="walkerOS" title="walkerOS" src="https://www.walkeros.io/img/walkerOS_logo.svg" width="256px"/>
  </a>
</p>

# @walkeros/server-store-gcs

Google Cloud Storage store with zero runtime dependencies. Uses raw `fetch`
against the GCS JSON API with built-in auth via Application Default Credentials
or an explicit service account JWT.

[Documentation](https://www.walkeros.io/docs/stores/server/gcs) &bull;
[NPM Package](https://www.npmjs.com/package/@walkeros/server-store-gcs) &bull;
[Source Code](https://github.com/elbwalker/walkerOS/tree/main/packages/server/stores/gcs)

## Installation

```bash
npm install @walkeros/server-store-gcs
```

## Quick start

```json
{
  "version": 4,
  "flows": {
    "default": {
      "config": { "platform": "server" },
      "stores": {
        "assets": { "package": "@walkeros/server-store-gcs", "config": {} }
      }
    }
  }
}
```

## Documentation

Full configuration, mapping, and examples live in the docs:
**https://www.walkeros.io/docs/stores/server/gcs**

## Contribute

Feel free to contribute by submitting an
[issue](https://github.com/elbwalker/walkerOS/issues), starting a
[discussion](https://github.com/elbwalker/walkerOS/discussions), or getting in
[contact](https://calendly.com/elb-alexander/30min).

## License

MIT
