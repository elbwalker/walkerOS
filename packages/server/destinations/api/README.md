<p align="left">
  <a href="https://www.walkeros.io">
    <img alt="walkerOS" title="walkerOS" src="https://www.walkeros.io/img/walkerOS_logo.svg" width="256px"/>
  </a>
</p>

# @walkeros/server-destination-api

Server-side HTTP API destination for Node.js.

[Documentation](https://www.walkeros.io/docs/destinations/api/server) &bull;
[NPM Package](https://www.npmjs.com/package/@walkeros/server-destination-api)
&bull;
[Source Code](https://github.com/elbwalker/walkerOS/tree/main/packages/server/destinations/api)

## Installation

```bash
npm install @walkeros/server-destination-api
```

## Quick start

```json
{
  "version": 4,
  "flows": {
    "default": {
      "config": { "platform": "server" },
      "destinations": {
        "api": { "package": "@walkeros/server-destination-api", "config": {} }
      }
    }
  }
}
```

## Documentation

Full configuration, mapping, and examples live in the docs:
**https://www.walkeros.io/docs/destinations/api/server**

## Contribute

Feel free to contribute by submitting an
[issue](https://github.com/elbwalker/walkerOS/issues), starting a
[discussion](https://github.com/elbwalker/walkerOS/discussions), or getting in
[contact](https://calendly.com/elb-alexander/30min).

## License

MIT
