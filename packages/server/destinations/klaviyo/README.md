<p align="left">
  <a href="https://www.walkeros.io">
    <img alt="walkerOS" title="walkerOS" src="https://www.walkeros.io/img/walkerOS_logo.svg" width="256px"/>
  </a>
</p>

# @walkeros/server-destination-klaviyo

Server-side event delivery to Klaviyo for email and SMS marketing automation.

[Documentation](https://www.walkeros.io/docs/destinations/server/klaviyo) &bull;
[NPM Package](https://www.npmjs.com/package/@walkeros/server-destination-klaviyo)
&bull;
[Source Code](https://github.com/elbwalker/walkerOS/tree/main/packages/server/destinations/klaviyo)

## Installation

```bash
npm install @walkeros/server-destination-klaviyo
```

## Quick start

```json
{
  "version": 4,
  "flows": {
    "default": {
      "config": { "platform": "server" },
      "destinations": {
        "klaviyo": {
          "package": "@walkeros/server-destination-klaviyo",
          "config": {}
        }
      }
    }
  }
}
```

## Documentation

Full configuration, mapping, and examples live in the docs:
**https://www.walkeros.io/docs/destinations/server/klaviyo**

## Contribute

Feel free to contribute by submitting an
[issue](https://github.com/elbwalker/walkerOS/issues), starting a
[discussion](https://github.com/elbwalker/walkerOS/discussions), or getting in
[contact](https://calendly.com/elb-alexander/30min).

## License

MIT
