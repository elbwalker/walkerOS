<p align="left">
  <a href="https://www.walkeros.io">
    <img alt="walkerOS" title="walkerOS" src="https://www.walkeros.io/img/walkerOS_logo.svg" width="256px"/>
  </a>
</p>

# @walkeros/runner

Runs prebuilt walkerOS flow artifacts. Ships the `runneros` binary.

This package cannot bundle. Build a flow with `walkeros bundle` (from
[`@walkeros/cli`](https://www.npmjs.com/package/@walkeros/cli)), then start the
artifact:

```bash
walkeros bundle flow.json
runneros start dist/flow.mjs --port 8080
```

`runneros start [artifact]` accepts a `.mjs`, `.js` or `.cjs` file, a `.tar.gz`
/ `.tgz` archive containing `flow.mjs`, or an http(s) URL to either. Without an
argument it uses `BUNDLE`; without either it uses `flow.mjs` in the working
directory. Anything else, a `.json` flow config above all, is refused.

Stdin is read only when the given path (argument or `BUNDLE`) does not exist:
piped content is then written to `/app/flow/flow.mjs` (or
`/tmp/walkeros-flow.mjs` outside a container) and started. An empty stdin is
ignored, so a missing file is reported as missing.

Credentials come from the environment only: `WALKEROS_DEPLOY_TOKEN` (or
`WALKEROS_TOKEN`) and `WALKEROS_APP_URL`, used with `--flow-id` and `--project`
(or `WALKEROS_FLOW_ID` and `WALKEROS_PROJECT_ID`) to enable the heartbeat and
secret injection.

[Documentation](https://www.walkeros.io/docs) &bull;
[Source Code](https://github.com/elbwalker/walkerOS/tree/main/packages/runner)
