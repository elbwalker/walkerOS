<p align="left">
  <a href="https://www.walkeros.io">
    <img alt="walkerOS" title="walkerOS" src="https://www.walkeros.io/img/walkerOS_logo.svg" width="256px"/>
  </a>
</p>

# @walkeros/server-destination-kafka

Server-side event streaming to Apache Kafka topics via kafkajs with JSON
serialization and compression.

[Documentation](https://www.walkeros.io/docs/destinations/server/kafka) &bull;
[NPM Package](https://www.npmjs.com/package/@walkeros/server-destination-kafka)
&bull;
[Source Code](https://github.com/elbwalker/walkerOS/tree/main/packages/server/destinations/kafka)

## Installation

```bash
npm install @walkeros/server-destination-kafka
```

## Quick start

```json
{
  "version": 4,
  "flows": {
    "default": {
      "config": { "platform": "server" },
      "destinations": {
        "kafka": {
          "package": "@walkeros/server-destination-kafka",
          "config": {}
        }
      }
    }
  }
}
```

## Documentation

Full configuration, mapping, and examples live in the docs:
**https://www.walkeros.io/docs/destinations/server/kafka**

## Contribute

Feel free to contribute by submitting an
[issue](https://github.com/elbwalker/walkerOS/issues), starting a
[discussion](https://github.com/elbwalker/walkerOS/discussions), or getting in
[contact](https://calendly.com/elb-alexander/30min).

## License

MIT
