<p align="left">
  <a href="https://www.walkeros.io">
    <img alt="walkerOS" title="walkerOS" src="https://www.walkeros.io/img/walkerOS_logo.svg" width="256px"/>
  </a>
</p>

# @walkeros/server-destination-bing

Server-side event delivery to Microsoft Advertising (Bing) UET Conversions API
for enhanced conversion tracking.

[Documentation](https://www.walkeros.io/docs/destinations/server/bing) &bull;
[NPM Package](https://www.npmjs.com/package/@walkeros/server-destination-bing)
&bull;
[Source Code](https://github.com/elbwalker/walkerOS/tree/main/packages/server/destinations/bing)

## Installation

```bash
npm install @walkeros/server-destination-bing
```

## Quick start

```json
{
  "version": 4,
  "flows": {
    "default": {
      "config": { "platform": "server" },
      "destinations": {
        "bing": { "package": "@walkeros/server-destination-bing", "config": {} }
      }
    }
  }
}
```

## Documentation

Full configuration, mapping, and examples live in the docs:
**https://www.walkeros.io/docs/destinations/server/bing**

## Contribute

Feel free to contribute by submitting an
[issue](https://github.com/elbwalker/walkerOS/issues), starting a
[discussion](https://github.com/elbwalker/walkerOS/discussions), or getting in
[contact](https://calendly.com/elb-alexander/30min).

## License

MIT
