<p align="left">
  <a href="https://www.walkeros.io">
    <img alt="walkerOS" title="walkerOS" src="https://www.walkeros.io/img/walkerOS_logo.svg" width="256px"/>
  </a>
</p>

# @walkeros/server-store-s3

S3-compatible object storage store using s3mini (~20 KB, zero dependencies).
Works with AWS S3, Cloudflare R2, Scaleway, DigitalOcean Spaces, Backblaze B2,
MinIO, and any S3-compatible provider.

[Documentation](https://www.walkeros.io/docs/stores/server/s3) &bull;
[NPM Package](https://www.npmjs.com/package/@walkeros/server-store-s3) &bull;
[Source Code](https://github.com/elbwalker/walkerOS/tree/main/packages/server/stores/s3)

## Installation

```bash
npm install @walkeros/server-store-s3
```

## Quick start

```json
{
  "version": 4,
  "flows": {
    "default": {
      "config": { "platform": "server" },
      "stores": {
        "assets": { "package": "@walkeros/server-store-s3", "config": {} }
      }
    }
  }
}
```

## Documentation

Full configuration, mapping, and examples live in the docs:
**https://www.walkeros.io/docs/stores/server/s3**

## Contribute

Feel free to contribute by submitting an
[issue](https://github.com/elbwalker/walkerOS/issues), starting a
[discussion](https://github.com/elbwalker/walkerOS/discussions), or getting in
[contact](https://calendly.com/elb-alexander/30min).

## License

MIT
