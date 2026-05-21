<p align="left">
  <a href="https://www.walkeros.io">
    <img alt="walkerOS" title="walkerOS" src="https://www.walkeros.io/img/walkerOS_logo.svg" width="256px"/>
  </a>
</p>

# @walkeros/web-destination-meta

Facebook and Instagram advertising pixel integration.

[Documentation](https://www.walkeros.io/docs/destinations/web/meta-pixel) &bull;
[NPM Package](https://www.npmjs.com/package/@walkeros/web-destination-meta)
&bull;
[Source Code](https://github.com/elbwalker/walkerOS/tree/main/packages/web/destinations/meta)

## Installation

```bash
npm install @walkeros/web-destination-meta
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
        "meta": {
          "package": "@walkeros/web-destination-meta",
          "config": {}
        }
      }
    }
  }
}
```

## Documentation

Full configuration, mapping, and examples live in the docs:
**https://www.walkeros.io/docs/destinations/web/meta-pixel**

## Contribute

Feel free to contribute by submitting an
[issue](https://github.com/elbwalker/walkerOS/issues), starting a
[discussion](https://github.com/elbwalker/walkerOS/discussions), or getting in
[contact](https://calendly.com/elb-alexander/30min).

## License

MIT
