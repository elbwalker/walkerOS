---
'@walkeros/mcp': patch
---

`@walkeros/mcp` now reads, bundles and runs flows through a capability runtime.
Embedders get the hosted runtime by default: inline JSON and saved flow ids
only, no local files, URLs, or in-process bundling, simulation and push. Pass
`runtime: createLocalRuntime()` to keep local file, URL and execution behaviour;
the stdio binary does so and is unchanged. `flow_simulate` is no longer
annotated read-only.
