<p align="left">
  <a href="https://www.walkeros.io">
    <img alt="walkerOS" title="walkerOS" src="https://www.walkeros.io/img/walkerOS_logo.svg" width="256px"/>
  </a>
</p>

# @walkeros/server-transformer-file

Serves static files in walkerOS server flows from a pluggable store backend,
deriving Content-Type from the file extension and responding directly.

[Documentation](https://www.walkeros.io/docs/transformers/file) &bull;
[NPM Package](https://www.npmjs.com/package/@walkeros/server-transformer-file)
&bull;
[Source Code](https://github.com/elbwalker/walkerOS/tree/main/packages/server/transformers/file)

## Installation

```bash
npm install @walkeros/server-transformer-file
```

## Quick start

```ts
import { startFlow } from '@walkeros/collector';
import { transformerFile } from '@walkeros/server-transformer-file';

await startFlow({
  transformers: {
    file: {
      code: transformerFile,
      config: {
        settings: {
          prefix: '/static',
          headers: { 'Cache-Control': 'public, max-age=3600' },
        },
      },
      env: { store: fileStore },
    },
  },
});
```

## Documentation

Full configuration, mapping, and examples live in the docs:
**https://www.walkeros.io/docs/transformers/file**

## Contribute

Feel free to contribute by submitting an
[issue](https://github.com/elbwalker/walkerOS/issues), starting a
[discussion](https://github.com/elbwalker/walkerOS/discussions), or getting in
[contact](https://calendly.com/elb-alexander/30min).

## License

MIT
