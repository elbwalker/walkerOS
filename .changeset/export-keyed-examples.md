---
'@walkeros/cli': minor
'@walkeros/mcp': minor
'@walkeros/core': patch
'@walkeros/config': patch
'@walkeros/server-destination-gcp': patch
'@walkeros/server-destination-aws': patch
'@walkeros/server-source-gcp': patch
'@walkeros/server-source-aws': patch
---

Packages with several exports ship `exportExamples`, dev examples keyed by
export name, so simulate, `flow_examples` and `package_get` use the Pub/Sub, SNS
or SQS examples and mock instead of the package default. Simulate refuses a
destination without a mock env instead of calling the real vendor.
`@walkeros/cli` now exports `resolveExportName` and `selectDevExamples`.
