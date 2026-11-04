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
import { sourceExpress } from '@walkeros/server-source-express';
import { transformerFile } from '@walkeros/server-transformer-file';
import { storeFsInit } from '@walkeros/server-store-fs';

// Reference this same object in stores and in env: the collector swaps it
// for the initialized store instance at startup.
const files = {
  code: storeFsInit,
  config: { settings: { basePath: './public' }, file: true },
};

await startFlow({
  stores: { files },
  sources: {
    http: {
      code: sourceExpress,
      config: {
        settings: { port: 8080, paths: ['/collect', '/static/*path'] },
        ingest: { map: { path: { key: 'path' } } },
      },
      next: 'file',
    },
  },
  transformers: {
    file: {
      code: transformerFile,
      config: {
        settings: {
          prefix: '/static',
          headers: { 'Cache-Control': 'public, max-age=3600' },
        },
      },
      env: { store: files },
    },
  },
});
```

`file: true` makes the store hand back each file's raw bytes. A request for
`/static/walker.js` is answered with `public/walker.js` and never becomes an
event.

## What it answers

The `prefix` declares which paths the step owns. `"prefix": "/"` owns every path
routed to it. Route only file requests to a step that owns `/`, as flow-complete
does with a `.js` case: any other path routed to it answers 404 and its event
stops there.

| Request                           | Answer                                                                 |
| --------------------------------- | ---------------------------------------------------------------------- |
| File found                        | 200 with the extension's Content-Type and `headers`                    |
| No file, path inside the `prefix` | 404 `{ "success": false, "error": "Not found" }`                       |
| Store read fails                  | 503 `{ "success": false, "error": "Service unavailable" }`, then fails |
| Path outside the `prefix`         | Passes on unchanged                                                    |
| No file, no `prefix` set          | Passes on unchanged                                                    |

The 404 and the 503 carry `Cache-Control: no-store`, not your `headers`. After a
503 the push fails with the store's error, which the collector logs at ERROR.

The step needs a store in `env.store`. Without one, or with a `$store.files`
string that did not resolve (as in `startFlow`, where only a bundled `flow.json`
resolves it), the flow does not start: the step throws a `config` error.

## Documentation

Full configuration and examples live in the docs:
**https://www.walkeros.io/docs/transformers/file**

## Contribute

Feel free to contribute by submitting an
[issue](https://github.com/elbwalker/walkerOS/issues), starting a
[discussion](https://github.com/elbwalker/walkerOS/discussions), or getting in
[contact](https://calendly.com/elb-alexander/30min).

## License

MIT
