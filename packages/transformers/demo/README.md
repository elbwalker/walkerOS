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

Add the transformer to a flow's `transformers` block and wire it into a source's
chain:

```json
{
  "version": 4,
  "flows": {
    "default": {
      "transformers": {
        "demo": { "package": "@walkeros/transformer-demo" }
      }
    }
  }
}
```

## Documentation

Full configuration, mapping, and examples live in the docs:
**https://www.walkeros.io/docs/transformers**

## Contribute

Feel free to contribute by submitting an
[issue](https://github.com/elbwalker/walkerOS/issues), starting a
[discussion](https://github.com/elbwalker/walkerOS/discussions), or getting in
[contact](https://calendly.com/elb-alexander/30min).

## License

MIT
