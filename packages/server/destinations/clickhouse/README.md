<p align="left">
  <a href="https://www.walkeros.io">
    <img alt="walkerOS" title="walkerOS" src="https://www.walkeros.io/img/walkerOS_logo.svg" width="256px"/>
  </a>
</p>

# @walkeros/server-destination-clickhouse

Server-side event storage in ClickHouse. Raw walkerOS events are written in bulk
as `JSONEachRow` inserts into a table you own.

[Documentation](https://www.walkeros.io/docs/destinations/server/clickhouse)
&bull;
[NPM Package](https://www.npmjs.com/package/@walkeros/server-destination-clickhouse)
&bull;
[Source Code](https://github.com/elbwalker/walkerOS/tree/main/packages/server/destinations/clickhouse)

## Installation

```bash
npm install @walkeros/server-destination-clickhouse
```

## Quick start

```json
{
  "version": 4,
  "flows": {
    "default": {
      "config": { "platform": "server" },
      "destinations": {
        "clickhouse": {
          "package": "@walkeros/server-destination-clickhouse",
          "config": {
            "settings": {
              "url": "https://clickhouse.example.com:8443",
              "database": "analytics",
              "table": "events"
            },
            "credentials": {
              "username": "walkeros_writer",
              "password": "$secret.CLICKHOUSE_PASSWORD"
            }
          }
        }
      }
    }
  }
}
```

## Documentation

Full configuration, mapping, and examples live in the docs:
**https://www.walkeros.io/docs/destinations/server/clickhouse**

## Contribute

Feel free to contribute by submitting an
[issue](https://github.com/elbwalker/walkerOS/issues), starting a
[discussion](https://github.com/elbwalker/walkerOS/discussions), or getting in
[contact](https://calendly.com/elb-alexander/30min).

## License

MIT
