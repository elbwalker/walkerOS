<p align="left">
  <a href="https://www.walkeros.io">
    <img alt="walkerOS" title="walkerOS" src="https://www.walkeros.io/img/walkerOS_logo.svg" width="256px"/>
  </a>
</p>

# @walkeros/transformer-demo

Logs events and passes them through, for testing and demonstrations without
external dependencies.

[Documentation](https://www.walkeros.io/docs/transformers) &bull;
[NPM Package](https://www.npmjs.com/package/@walkeros/transformer-demo) &bull;
[Source Code](https://github.com/elbwalker/walkerOS/tree/main/packages/transformers/demo)

## Installation

```bash
npm install @walkeros/transformer-demo
```

## Quick start

Add the transformer to a flow's `transformers` block and name it in a chain,
here the demo source's `next`:

```json
{
  "version": 4,
  "flows": {
    "default": {
      "config": { "platform": "web" },
      "sources": {
        "demo": {
          "package": "@walkeros/source-demo",
          "config": { "settings": { "events": [{ "name": "page view" }] } },
          "next": "demo"
        }
      },
      "transformers": {
        "demo": { "package": "@walkeros/transformer-demo" }
      }
    }
  }
}
```

Each event the demo source emits is logged to the console as
`[transformer-demo] {...}` and passes on unchanged. A transformer that no chain
names never runs, and nothing reports it.

## Settings

| Setting            | Type       | Required | Description                                                                          |
| ------------------ | ---------- | -------- | ------------------------------------------------------------------------------------ |
| `name`             | `string`   | no       | Prefix of each log line. Default: `transformer-demo`.                                |
| `fields`           | `string[]` | no       | Dot-notation paths to log instead of the whole event, such as `data.title`.          |
| `addProcessedFlag` | `boolean`  | no       | Adds `_processed: true` and `_processedBy` (the `name`) to `event.data` when `true`. |

## Documentation

How transformers are wired into a flow:
**https://www.walkeros.io/docs/transformers**

## Contribute

Feel free to contribute by submitting an
[issue](https://github.com/elbwalker/walkerOS/issues), starting a
[discussion](https://github.com/elbwalker/walkerOS/discussions), or getting in
[contact](https://calendly.com/elb-alexander/30min).

## License

MIT
