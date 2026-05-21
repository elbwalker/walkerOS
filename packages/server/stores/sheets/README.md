<p align="left">
  <a href="https://www.walkeros.io">
    <img alt="walkerOS" title="walkerOS" src="https://www.walkeros.io/img/walkerOS_logo.svg" width="256px"/>
  </a>
</p>

# @walkeros/server-store-sheets

Google Sheets store with zero runtime dependencies. Uses raw `fetch` against the
Sheets v4 REST API with built-in auth. Designed for demos and small-scale
prototyping, not as a production CRM substitute.

[Documentation](https://www.walkeros.io/docs/stores/server/sheets) &bull;
[NPM Package](https://www.npmjs.com/package/@walkeros/server-store-sheets)
&bull;
[Source Code](https://github.com/elbwalker/walkerOS/tree/main/packages/server/stores/sheets)

## Installation

```bash
npm install @walkeros/server-store-sheets
```

## Quick start

```json
{
  "version": 4,
  "flows": {
    "default": {
      "config": { "platform": "server" },
      "stores": {
        "assets": { "package": "@walkeros/server-store-sheets", "config": {} }
      }
    }
  }
}
```

## Documentation

Full configuration, mapping, and examples live in the docs:
**https://www.walkeros.io/docs/stores/server/sheets**

## Contribute

Feel free to contribute by submitting an
[issue](https://github.com/elbwalker/walkerOS/issues), starting a
[discussion](https://github.com/elbwalker/walkerOS/discussions), or getting in
[contact](https://calendly.com/elb-alexander/30min).

## License

MIT
