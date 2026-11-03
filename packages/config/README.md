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
    "rootDir": "src",
    "outDir": "dist",
    "tsBuildInfoFile": "dist/tsconfig.tsbuildinfo"
  },
  "include": ["src/**/*"]
}
```

Set `outDir` and `tsBuildInfoFile` in your own file: TypeScript resolves a path
in an extended config against that config's folder, so both inherited paths
point into `node_modules/@walkeros/config/tsconfig/`, where every project that
extends the base shares one build-info file. With the inherited build-info path,
deleting `dist` and running `tsc` again exits 0 and writes nothing.

## Entry points

| Import                                                                   | Content                                                                                                                                                                                                                                                                                           |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@walkeros/config/tsconfig/base.json`, `web.json`, `node.json`           | TypeScript presets; `web` adds the DOM lib and targets ES2018.                                                                                                                                                                                                                                    |
| `@walkeros/config/eslint`, `eslint/web`, `eslint/node`, `eslint/neutral` | ESLint flat configs: the base and one per platform.                                                                                                                                                                                                                                               |
| `@walkeros/config/tsup`                                                  | tsup helpers: `baseConfig`, `defineConfig`, `buildModules`, `buildDev`, `buildBrowser`, `buildES5`, `buildExamples`. No type declarations resolve for this import, so a strict typecheck of a `tsup.config.ts` that imports it reports TS7016, and `tsup/index.d.ts` does not declare `buildDev`. |
| `@walkeros/config/jest`, `jest/web.config`, `jest/node.config`           | Jest configs for packages inside the walkerOS repository: they map `@walkeros/*` imports to its package sources and throw anywhere else.                                                                                                                                                          |

## Documentation

`buildDev` writes the `dist/walkerOS.json` a step package publishes; see
[Build-time generation](https://www.walkeros.io/docs/destinations/create-your-own#build-time-generation).

## Contribute

Feel free to contribute by submitting an
[issue](https://github.com/elbwalker/walkerOS/issues), starting a
[discussion](https://github.com/elbwalker/walkerOS/discussions), or getting in
[contact](https://calendly.com/elb-alexander/30min).

## License

MIT
