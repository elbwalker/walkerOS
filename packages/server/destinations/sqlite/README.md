<p align="left">
  <a href="https://www.walkeros.io">
    <img alt="walkerOS" title="walkerOS" src="https://www.walkeros.io/img/walkerOS_logo.svg" width="256px"/>
  </a>
</p>

# @walkeros/server-destination-sqlite

Persists walkerOS events to SQLite, with one interface over two drivers:
better-sqlite3 for local files and @libsql/client for remote Turso / libSQL.

[Documentation](https://www.walkeros.io/docs/destinations/server/sqlite) &bull;
[NPM Package](https://www.npmjs.com/package/@walkeros/server-destination-sqlite)
&bull;
[Source Code](https://github.com/elbwalker/walkerOS/tree/main/packages/server/destinations/sqlite)

## Installation

```bash
npm install @walkeros/server-destination-sqlite
```

## Quick start

```json
{
  "version": 4,
  "flows": {
    "default": {
      "config": { "platform": "server" },
      "destinations": {
        "sqlite": {
          "package": "@walkeros/server-destination-sqlite",
          "config": {}
        }
      }
    }
  }
}
```

## Documentation

Full configuration, mapping, and examples live in the docs:
**https://www.walkeros.io/docs/destinations/server/sqlite**

## Contribute

Feel free to contribute by submitting an
[issue](https://github.com/elbwalker/walkerOS/issues), starting a
[discussion](https://github.com/elbwalker/walkerOS/discussions), or getting in
[contact](https://calendly.com/elb-alexander/30min).

## License

MIT
