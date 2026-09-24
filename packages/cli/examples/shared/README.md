# shared

Files the server flow of `flow-complete.json` serves first party.

- Root `include: ["./shared"]` ships this folder next to the server artifact.
- The `assets` store (`@walkeros/server-store-fs`,
  `basePath: "$env.ASSETS_DIR:./shared"`) reads from it, and the `file`
  transformer answers `GET /walker.js` with it.
- `walker.js` is generated, not committed. Build the web flow, then copy it here
  (root `include` also applies to the web build, so writing the bundle straight
  into this folder is refused as a circular include):

```bash
walkeros bundle packages/cli/examples/flow-complete.json -f web -o dist/web/walker.js
cp dist/web/walker.js packages/cli/examples/shared/walker.js
```

- Then build and start the server flow; the artifact carries its own copy of
  this folder:

```bash
walkeros bundle packages/cli/examples/flow-complete.json -f server -o dist/server.mjs
runneros start dist/server.mjs -p 8080 --env-file .env
```
