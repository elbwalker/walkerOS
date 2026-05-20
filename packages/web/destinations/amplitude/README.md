<p align="left">
  <a href="https://www.walkeros.io">
    <img alt="walkerOS" title="walkerOS" src="https://www.walkeros.io/img/walkerOS_logo.svg" width="256px"/>
  </a>
</p>

# @walkeros/web-destination-amplitude

Product analytics, identity, revenue, and optional session replay, experiments,
and guides & surveys.

[Documentation](https://www.walkeros.io/docs/destinations/web/amplitude) &bull;
[NPM Package](https://www.npmjs.com/package/@walkeros/web-destination-amplitude)
&bull;
[Source Code](https://github.com/elbwalker/walkerOS/tree/main/packages/web/destinations/amplitude)

## Installation

```bash
npm install @walkeros/web-destination-amplitude
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
        "amplitude": {
          "package": "@walkeros/web-destination-amplitude",
          "config": {}
        }
      }
    }
  }
}
```

## Documentation

Full configuration, mapping, and examples live in the docs:
**https://www.walkeros.io/docs/destinations/web/amplitude**

## Contribute

Feel free to contribute by submitting an
[issue](https://github.com/elbwalker/walkerOS/issues), starting a
[discussion](https://github.com/elbwalker/walkerOS/discussions), or getting in
[contact](https://calendly.com/elb-alexander/30min).

## License

MIT
