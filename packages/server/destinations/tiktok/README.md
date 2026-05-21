<p align="left">
  <a href="https://www.walkeros.io">
    <img alt="walkerOS" title="walkerOS" src="https://www.walkeros.io/img/walkerOS_logo.svg" width="256px"/>
  </a>
</p>

# @walkeros/server-destination-tiktok

Server-side event delivery to TikTok's Events API for enhanced conversion
tracking, bypassing browser limitations and improving match quality for ad
optimization.

[Documentation](https://www.walkeros.io/docs/destinations/server/tiktok) &bull;
[NPM Package](https://www.npmjs.com/package/@walkeros/server-destination-tiktok)
&bull;
[Source Code](https://github.com/elbwalker/walkerOS/tree/main/packages/server/destinations/tiktok)

## Installation

```bash
npm install @walkeros/server-destination-tiktok
```

## Quick start

```json
{
  "version": 4,
  "flows": {
    "default": {
      "config": { "platform": "server" },
      "destinations": {
        "tiktok": {
          "package": "@walkeros/server-destination-tiktok",
          "config": {}
        }
      }
    }
  }
}
```

## Documentation

Full configuration, mapping, and examples live in the docs:
**https://www.walkeros.io/docs/destinations/server/tiktok**

## Contribute

Feel free to contribute by submitting an
[issue](https://github.com/elbwalker/walkerOS/issues), starting a
[discussion](https://github.com/elbwalker/walkerOS/discussions), or getting in
[contact](https://calendly.com/elb-alexander/30min).

## License

MIT
