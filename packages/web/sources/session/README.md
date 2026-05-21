<p align="left">
  <a href="https://www.walkeros.io">
    <img alt="walkerOS" title="walkerOS" src="https://www.walkeros.io/img/walkerOS_logo.svg" width="256px"/>
  </a>
</p>

# @walkeros/web-source-session

Standalone session detection and management that can be composed with any
walkerOS source.

[Documentation](https://www.walkeros.io/docs/sources/web/session) &bull;
[NPM Package](https://www.npmjs.com/package/@walkeros/web-source-session) &bull;
[Source Code](https://github.com/elbwalker/walkerOS/tree/main/packages/web/sources/session)

## Installation

```bash
npm install @walkeros/web-source-session
```

## Quick start

```json
{
  "version": 4,
  "flows": {
    "default": {
      "config": { "platform": "web" },
      "sources": {
        "session": { "package": "@walkeros/web-source-session", "config": {} }
      }
    }
  }
}
```

## Documentation

Full configuration, mapping, and examples live in the docs:
**https://www.walkeros.io/docs/sources/web/session**

## Contribute

Feel free to contribute by submitting an
[issue](https://github.com/elbwalker/walkerOS/issues), starting a
[discussion](https://github.com/elbwalker/walkerOS/discussions), or getting in
[contact](https://calendly.com/elb-alexander/30min).

## License

MIT
