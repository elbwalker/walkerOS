<p align="left">
  <a href="https://www.walkeros.io">
    <img alt="walkerOS" title="walkerOS" src="https://www.walkeros.io/img/walkerOS_logo.svg" width="256px"/>
  </a>
</p>

# @walkeros/server-destination-pinterest

Server-side event delivery to Pinterest's Conversions API for enhanced
conversion tracking, bypassing browser limitations for improved data quality and
privacy compliance.

[Documentation](https://www.walkeros.io/docs/destinations/server/pinterest)
&bull;
[NPM Package](https://www.npmjs.com/package/@walkeros/server-destination-pinterest)
&bull;
[Source Code](https://github.com/elbwalker/walkerOS/tree/main/packages/server/destinations/pinterest)

## Installation

```bash
npm install @walkeros/server-destination-pinterest
```

## Quick start

```json
{
  "version": 4,
  "flows": {
    "default": {
      "config": { "platform": "server" },
      "destinations": {
        "pinterest": {
          "package": "@walkeros/server-destination-pinterest",
          "config": {}
        }
      }
    }
  }
}
```

## Documentation

Full configuration, mapping, and examples live in the docs:
**https://www.walkeros.io/docs/destinations/server/pinterest**

## Contribute

Feel free to contribute by submitting an
[issue](https://github.com/elbwalker/walkerOS/issues), starting a
[discussion](https://github.com/elbwalker/walkerOS/discussions), or getting in
[contact](https://calendly.com/elb-alexander/30min).

## License

MIT
