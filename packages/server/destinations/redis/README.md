<p align="left">
  <a href="https://www.walkeros.io">
    <img alt="walkerOS" title="walkerOS" src="https://www.walkeros.io/img/walkerOS_logo.svg" width="256px"/>
  </a>
</p>

# @walkeros/server-destination-redis

Server-side event streaming to Redis Streams via the ioredis client, with
configurable XADD streams, optional MAXLEN trimming, JSON or flat serialization,
and graceful shutdown.

[Documentation](https://www.walkeros.io/docs/destinations/server/redis) &bull;
[NPM Package](https://www.npmjs.com/package/@walkeros/server-destination-redis)
&bull;
[Source Code](https://github.com/elbwalker/walkerOS/tree/main/packages/server/destinations/redis)

## Installation

```bash
npm install @walkeros/server-destination-redis
```

## Quick start

```json
{
  "version": 4,
  "flows": {
    "default": {
      "config": { "platform": "server" },
      "destinations": {
        "redis": {
          "package": "@walkeros/server-destination-redis",
          "config": {}
        }
      }
    }
  }
}
```

## Documentation

Full configuration, mapping, and examples live in the docs:
**https://www.walkeros.io/docs/destinations/server/redis**

## Contribute

Feel free to contribute by submitting an
[issue](https://github.com/elbwalker/walkerOS/issues), starting a
[discussion](https://github.com/elbwalker/walkerOS/discussions), or getting in
[contact](https://calendly.com/elb-alexander/30min).

## License

MIT
