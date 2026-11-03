---
'@walkeros/cli': patch
---

The bundler's dependency mismatch warning now points to
`config.bundle.overrides` in the flow file. `examples/flow-complete.json` reads
its two salts and the Meta access token as `$secret.` values, the example flows
`server-collect.json`, `web-serve.json` and `flow-selfhost-test.json` pass
`validate --strict`, and the telemetry contract says telemetry is opt-in.
