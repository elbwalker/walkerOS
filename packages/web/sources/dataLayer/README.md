<p align="left">
  <a href="https://www.walkeros.io">
    <img alt="walkerOS" title="walkerOS" src="https://www.walkeros.io/img/walkerOS_logo.svg" width="256px"/>
  </a>
</p>

# @walkeros/web-source-datalayer

Integrates with existing Google Analytics 4 and GTM dataLayer implementations by
intercepting `dataLayer.push()` calls and converting them into walkerOS events.

[Documentation](https://www.walkeros.io/docs/sources/web/dataLayer) &bull;
[NPM Package](https://www.npmjs.com/package/@walkeros/web-source-datalayer)
&bull;
[Source Code](https://github.com/elbwalker/walkerOS/tree/main/packages/web/sources/dataLayer)

## Installation

```bash
npm install @walkeros/web-source-datalayer
```

## Quick start

```json
{
  "version": 4,
  "flows": {
    "default": {
      "config": { "platform": "web" },
      "sources": {
        "dataLayer": {
          "package": "@walkeros/web-source-datalayer",
          "config": {}
        }
      }
    }
  }
}
```

## Documentation

Full configuration, mapping, and examples live in the docs:
**https://www.walkeros.io/docs/sources/web/dataLayer**

## Contribute

Feel free to contribute by submitting an
[issue](https://github.com/elbwalker/walkerOS/issues), starting a
[discussion](https://github.com/elbwalker/walkerOS/discussions), or getting in
[contact](https://calendly.com/elb-alexander/30min).

## License

MIT
