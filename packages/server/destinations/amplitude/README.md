<p align="left">
  <a href="https://www.walkeros.io">
    <img alt="walkerOS" title="walkerOS" src="https://www.walkeros.io/img/walkerOS_logo.svg" width="256px"/>
  </a>
</p>

# @walkeros/server-destination-amplitude

Server-side event delivery to Amplitude for product analytics with per-event
identity.

[Documentation](https://www.walkeros.io/docs/destinations/server/amplitude)
&bull;
[NPM Package](https://www.npmjs.com/package/@walkeros/server-destination-amplitude)
&bull;
[Source Code](https://github.com/elbwalker/walkerOS/tree/main/packages/server/destinations/amplitude)

## Installation

```bash
npm install @walkeros/server-destination-amplitude
```

## Quick start

```json
{
  "version": 4,
  "flows": {
    "default": {
      "config": { "platform": "server" },
      "destinations": {
        "amplitude": {
          "package": "@walkeros/server-destination-amplitude",
          "config": {}
        }
      }
    }
  }
}
```

## Documentation

Full configuration, mapping, and examples live in the docs:
**https://www.walkeros.io/docs/destinations/server/amplitude**

## Contribute

Feel free to contribute by submitting an
[issue](https://github.com/elbwalker/walkerOS/issues), starting a
[discussion](https://github.com/elbwalker/walkerOS/discussions), or getting in
[contact](https://calendly.com/elb-alexander/30min).

## License

MIT
