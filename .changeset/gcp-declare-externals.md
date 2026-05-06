---
'@walkeros/server-destination-gcp': patch
---

Declare `@google-cloud/bigquery-storage` as a bundle external via
`walkerOS.bundle.external`. Fixes `__dirname is not defined in ES module scope`
when bundling a flow that uses BigQuery Storage Write API. The bundler's closure
walker pulls in the transitive gRPC stack (`@grpc/grpc-js`,
`@grpc/proto-loader`, `protobufjs`, `google-gax`) automatically via
`bigquery-storage`'s own dependencies and peerDependencies, so only the one
entry needs to be declared. Requires `@walkeros/cli` >= the version shipping the
bundler-externals feature.
