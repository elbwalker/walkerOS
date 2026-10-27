<p align="left">
  <a href="https://www.walkeros.io">
    <img alt="walkerOS" title="walkerOS" src="https://www.walkeros.io/img/walkerOS_logo.svg" width="256px"/>
  </a>
</p>

# @walkeros/web-destination-tiktok

Conversion tracking and Advanced Matching for TikTok Ads.

[Documentation](https://www.walkeros.io/docs/destinations/web/tiktok) &bull;
[NPM Package](https://www.npmjs.com/package/@walkeros/web-destination-tiktok)
&bull;
[Source Code](https://github.com/elbwalker/walkerOS/tree/main/packages/web/destinations/tiktok)

## Installation

```bash
npm install @walkeros/web-destination-tiktok
```

## Quick start

```json
{
  "version": 4,
  "flows": {
    "default": {
      "config": {
        "platform": "web"
      },
      "destinations": {
        "tiktok": {
          "package": "@walkeros/web-destination-tiktok",
          "config": { "settings": { "apiKey": "C4A1B2C3D4E5F6A7B8C9" } }
        }
      }
    }
  }
}
```

The destination starts only when `window.ttq` already provides `load`; whatever
sets it up runs outside the consent gate, see the docs. This quick start sets no
consent: add `consent: { marketing: true }` to `config` before you go live.

## Documentation

Full configuration, mapping, and examples live in the docs:
**https://www.walkeros.io/docs/destinations/web/tiktok**

## Contribute

Feel free to contribute by submitting an
[issue](https://github.com/elbwalker/walkerOS/issues), starting a
[discussion](https://github.com/elbwalker/walkerOS/discussions), or getting in
[contact](https://calendly.com/elb-alexander/30min).

## License

MIT
