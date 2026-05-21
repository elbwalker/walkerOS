<p align="left">
  <a href="https://www.walkeros.io">
    <img alt="walkerOS" title="walkerOS" src="https://www.walkeros.io/img/walkerOS_logo.svg" width="256px"/>
  </a>
</p>

# @walkeros/server-store-fs

Local filesystem store for walkerOS server flows. Reads and writes files
relative to a base directory with path traversal protection.

[Documentation](https://www.walkeros.io/docs/stores/server/fs) &bull;
[NPM Package](https://www.npmjs.com/package/@walkeros/server-store-fs) &bull;
[Source Code](https://github.com/elbwalker/walkerOS/tree/main/packages/server/stores/fs)

## Installation

```bash
npm install @walkeros/server-store-fs
```

## Quick start

```json
{
  "version": 4,
  "flows": {
    "default": {
      "config": { "platform": "server" },
      "stores": {
        "assets": { "package": "@walkeros/server-store-fs", "config": {} }
      }
    }
  }
}
```

## Documentation

Full configuration, mapping, and examples live in the docs:
**https://www.walkeros.io/docs/stores/server/fs**

## Contribute

Feel free to contribute by submitting an
[issue](https://github.com/elbwalker/walkerOS/issues), starting a
[discussion](https://github.com/elbwalker/walkerOS/discussions), or getting in
[contact](https://calendly.com/elb-alexander/30min).

## License

MIT
