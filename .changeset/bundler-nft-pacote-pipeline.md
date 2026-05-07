---
'@walkeros/cli': patch
'@walkeros/server-destination-gcp': patch
---

@walkeros/cli: Server bundles now use @vercel/nft to trace dependencies and copy
only files actually used into dist/node_modules/. Pacote remains the install
layer (driven by flow.json's config.bundle.packages field; users do not run npm
install for step packages). The walkerOS.bundle.external annotation field on
package manifests is no longer recognized (deprecation warning if seen). The
flow.<name>.config.bundle.external sub-field on flow configs is also no longer
supported (warned and stripped during load). The
flow.<name>.config.bundle.traceInclude field is the escape hatch for cases nft
cannot statically trace. Server output is always a directory: dist/{flow.mjs,
package.json, node_modules/}. Default output filename changed from bundle.mjs to
flow.mjs. The runtime image expects /app/flow/flow.mjs. flow.json schema is
unchanged (still v4); only @walkeros/cli bumps. Migration: see
https://walkeros.io/docs/migrate/cli-4x.

@walkeros/server-destination-gcp: removed obsolete walkerOS.bundle.external
annotation from package manifest. nft handles externalization automatically. No
behavior change for consumers.
