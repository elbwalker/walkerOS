<p align="left">
  <a href="https://www.walkeros.io">
    <img alt="walkerOS" title="walkerOS" src="https://www.walkeros.io/img/walkerOS_logo.svg" width="256px"/>
  </a>
</p>

# @walkeros/web-destination-gtag

Unified Google destination supporting GA4, Google Ads, and GTM through a single
gtag implementation.

[Documentation](https://www.walkeros.io/docs/destinations/web/gtag) &bull;
[NPM Package](https://www.npmjs.com/package/@walkeros/web-destination-gtag)
&bull;
[Source Code](https://github.com/elbwalker/walkerOS/tree/main/packages/web/destinations/gtag)

## Installation

```bash
npm install @walkeros/web-destination-gtag
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
        "gtag": {
          "package": "@walkeros/web-destination-gtag",
          "config": {}
        }
      }
    }
  }
}
```

## Documentation

Full configuration, mapping, and examples live in the docs:
**https://www.walkeros.io/docs/destinations/web/gtag**

## Contribute

Feel free to contribute by submitting an
[issue](https://github.com/elbwalker/walkerOS/issues), starting a
[discussion](https://github.com/elbwalker/walkerOS/discussions), or getting in
[contact](https://calendly.com/elb-alexander/30min).

## License

MIT
