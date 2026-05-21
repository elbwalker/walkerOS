<p align="left">
  <a href="https://www.walkeros.io">
    <img alt="walkerOS" title="walkerOS" src="https://www.walkeros.io/img/walkerOS_logo.svg" width="256px"/>
  </a>
</p>

# @walkeros/web-destination-hotjar

Session recordings, heatmaps, and on-page feedback.

[Documentation](https://www.walkeros.io/docs/destinations/web/hotjar) &bull;
[NPM Package](https://www.npmjs.com/package/@walkeros/web-destination-hotjar)
&bull;
[Source Code](https://github.com/elbwalker/walkerOS/tree/main/packages/web/destinations/hotjar)

## Installation

```bash
npm install @walkeros/web-destination-hotjar
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
        "hotjar": {
          "package": "@walkeros/web-destination-hotjar",
          "config": {}
        }
      }
    }
  }
}
```

## Documentation

Full configuration, mapping, and examples live in the docs:
**https://www.walkeros.io/docs/destinations/web/hotjar**

## Contribute

Feel free to contribute by submitting an
[issue](https://github.com/elbwalker/walkerOS/issues), starting a
[discussion](https://github.com/elbwalker/walkerOS/discussions), or getting in
[contact](https://calendly.com/elb-alexander/30min).

## License

MIT
