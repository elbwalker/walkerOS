<p align="left">
  <a href="https://www.walkeros.io">
    <img alt="walkerOS" title="walkerOS" src="https://www.walkeros.io/img/walkerOS_logo.svg" width="256px"/>
  </a>
</p>

# @walkeros/server-source-express

Turn-key HTTP event collection server with Express.js. Runs standalone or embeds
inside an existing Express app, handles JSON POST events (including
`navigator.sendBeacon` payloads sent as `text/plain`), raw `text/plain` bodies
for request decoders such as `@walkeros/transformer-ga4`, pixel tracking via
GET, and configurable CORS.

A `text/plain` POST body is parsed as JSON when it is JSON
(`navigator.sendBeacon` sends JSON as `text/plain`) and otherwise kept as the
raw string on `ingest.body`, so a `before` transformer can decode it, for
example batched gtag.js hits with `@walkeros/transformer-ga4`. An
`application/json` body must parse, or the request is answered with 400.

[Documentation](https://www.walkeros.io/docs/sources/server/express) &bull;
[NPM Package](https://www.npmjs.com/package/@walkeros/server-source-express)
&bull;
[Source Code](https://github.com/elbwalker/walkerOS/tree/main/packages/server/sources/express)

## Installation

```bash
npm install @walkeros/server-source-express
```

## Quick start

```json
{
  "version": 4,
  "flows": {
    "default": {
      "config": { "platform": "server" },
      "sources": {
        "express": {
          "package": "@walkeros/server-source-express",
          "config": {}
        }
      }
    }
  }
}
```

## Documentation

Full configuration, mapping, and examples live in the docs:
**https://www.walkeros.io/docs/sources/server/express**

## Contribute

Feel free to contribute by submitting an
[issue](https://github.com/elbwalker/walkerOS/issues), starting a
[discussion](https://github.com/elbwalker/walkerOS/discussions), or getting in
[contact](https://calendly.com/elb-alexander/30min).

## License

MIT
