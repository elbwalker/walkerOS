<p align="left">
  <a href="https://www.walkeros.io">
    <img alt="walkerOS" title="walkerOS" src="https://www.walkeros.io/img/walkerOS_logo.svg" width="256px"/>
  </a>
</p>

# @walkeros/source-demo

Generates walkerOS events from a configuration array for testing,
demonstrations, and examples, with no external dependencies.

[Documentation](https://www.walkeros.io/docs/sources) &bull;
[NPM Package](https://www.npmjs.com/package/@walkeros/source-demo) &bull;
[Source Code](https://github.com/elbwalker/walkerOS/tree/main/packages/web/sources/demo)

## Installation

```bash
npm install @walkeros/source-demo
```

## Quick start

```json
{
  "version": 4,
  "flows": {
    "default": {
      "config": { "platform": "web" },
      "sources": {
        "demo": {
          "package": "@walkeros/source-demo",
          "config": { "settings": { "events": [{ "name": "page view" }] } }
        }
      }
    }
  }
}
```

## Settings

| Setting  | Type    | Required | Description                                                                                                          |
| -------- | ------- | -------- | -------------------------------------------------------------------------------------------------------------------- |
| `events` | `array` | yes      | Partial walkerOS events, each pushed once when the source starts. An event's `delay` holds it back, in milliseconds. |

## Documentation

How sources feed a flow: **https://www.walkeros.io/docs/sources**

## Contribute

Feel free to contribute by submitting an
[issue](https://github.com/elbwalker/walkerOS/issues), starting a
[discussion](https://github.com/elbwalker/walkerOS/discussions), or getting in
[contact](https://calendly.com/elb-alexander/30min).

## License

MIT
