<p align="left">
  <a href="https://www.walkeros.io">
    <img alt="walkerOS" title="walkerOS" src="https://www.walkeros.io/img/walkerOS_logo.svg" width="256px"/>
  </a>
</p>

# @walkeros/server-destination-snapchat

Server-side event delivery to Snapchat's Conversions API v3 for enhanced
conversion tracking, bypassing browser limitations and improving match quality
for ad optimization.

[Documentation](https://www.walkeros.io/docs/destinations/server/snapchat)
&bull;
[NPM Package](https://www.npmjs.com/package/@walkeros/server-destination-snapchat)
&bull;
[Source Code](https://github.com/elbwalker/walkerOS/tree/main/packages/server/destinations/snapchat)

## Installation

```bash
npm install @walkeros/server-destination-snapchat
```

## Quick start

```json
{
  "version": 4,
  "flows": {
    "default": {
      "config": { "platform": "server" },
      "destinations": {
        "snapchat": {
          "package": "@walkeros/server-destination-snapchat",
          "config": {}
        }
      }
    }
  }
}
```

## Documentation

Full configuration, mapping, and examples live in the docs:
**https://www.walkeros.io/docs/destinations/server/snapchat**

## Contribute

Feel free to contribute by submitting an
[issue](https://github.com/elbwalker/walkerOS/issues), starting a
[discussion](https://github.com/elbwalker/walkerOS/discussions), or getting in
[contact](https://calendly.com/elb-alexander/30min).

## License

MIT
