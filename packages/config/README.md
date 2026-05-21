<p align="left">
  <a href="https://www.walkeros.io">
    <img alt="walkerOS" title="walkerOS" src="https://www.walkeros.io/img/walkerOS_logo.svg" width="256px"/>
  </a>
</p>

# @walkeros/config

Shared development configuration for walkerOS packages, providing common
TypeScript, ESLint, Jest, and tsup build tooling.

[Documentation](https://www.walkeros.io/docs) &bull;
[NPM Package](https://www.npmjs.com/package/@walkeros/config) &bull;
[Source Code](https://github.com/elbwalker/walkerOS/tree/main/packages/config)

## Installation

```bash
npm install --save-dev @walkeros/config
```

## Quick start

Extend a shared config, for example in your `tsconfig.json`:

```json
{
  "extends": "@walkeros/config/tsconfig/base.json",
  "compilerOptions": {
    "rootDir": "src"
  },
  "include": ["src/**/*"]
}
```

## Documentation

Full configuration, mapping, and examples live in the docs:
**https://www.walkeros.io/docs**

## Contribute

Feel free to contribute by submitting an
[issue](https://github.com/elbwalker/walkerOS/issues), starting a
[discussion](https://github.com/elbwalker/walkerOS/discussions), or getting in
[contact](https://calendly.com/elb-alexander/30min).

## License

MIT
