<p align="left">
  <a href="https://www.walkeros.io">
    <img alt="walkerOS" title="walkerOS" src="https://www.walkeros.io/img/walkerOS_logo.svg" width="256px"/>
  </a>
</p>

# @walkeros/web-source-browser

Captures user interactions directly from the DOM using `data-elb-*` attributes,
with automatic pageviews, an enhanced `elb` function, and a built-in trigger
system.

[Documentation](https://www.walkeros.io/docs/sources/web/browser) &bull;
[NPM Package](https://www.npmjs.com/package/@walkeros/web-source-browser) &bull;
[Source Code](https://github.com/elbwalker/walkerOS/tree/main/packages/web/sources/browser)

## Installation

```bash
npm install @walkeros/web-source-browser
```

## Quick start

```json
{
  "version": 4,
  "flows": {
    "default": {
      "config": { "platform": "web" },
      "sources": {
        "browser": { "package": "@walkeros/web-source-browser", "config": {} }
      }
    }
  }
}
```

## Documentation

Full configuration, mapping, and examples live in the docs:
**https://www.walkeros.io/docs/sources/web/browser**

## Contribute

Feel free to contribute by submitting an
[issue](https://github.com/elbwalker/walkerOS/issues), starting a
[discussion](https://github.com/elbwalker/walkerOS/discussions), or getting in
[contact](https://calendly.com/elb-alexander/30min).

## License

MIT
