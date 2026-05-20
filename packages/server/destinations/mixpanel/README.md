<p align="left">
  <a href="https://www.walkeros.io">
    <img alt="walkerOS" title="walkerOS" src="https://www.walkeros.io/img/walkerOS_logo.svg" width="256px"/>
  </a>
</p>

# @walkeros/server-destination-mixpanel

Server-side event delivery to Mixpanel for product analytics, people profiles,
and group analytics via the official Mixpanel Node.js SDK.

[Documentation](https://www.walkeros.io/docs/destinations/server/mixpanel)
&bull;
[NPM Package](https://www.npmjs.com/package/@walkeros/server-destination-mixpanel)
&bull;
[Source Code](https://github.com/elbwalker/walkerOS/tree/main/packages/server/destinations/mixpanel)

## Installation

```bash
npm install @walkeros/server-destination-mixpanel
```

## Quick start

```json
{
  "version": 4,
  "flows": {
    "default": {
      "config": { "platform": "server" },
      "destinations": {
        "mixpanel": {
          "package": "@walkeros/server-destination-mixpanel",
          "config": {}
        }
      }
    }
  }
}
```

## Documentation

Full configuration, mapping, and examples live in the docs:
**https://www.walkeros.io/docs/destinations/server/mixpanel**

## Contribute

Feel free to contribute by submitting an
[issue](https://github.com/elbwalker/walkerOS/issues), starting a
[discussion](https://github.com/elbwalker/walkerOS/discussions), or getting in
[contact](https://calendly.com/elb-alexander/30min).

## License

MIT
