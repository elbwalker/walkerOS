---
'@walkeros/cli': patch
---

Bundler honors `walkerOS.bundle.external` declared in step-package package.json
files. Listed packages are externalized from the ESM bundle and the bundler
always installs them (plus their full transitive deps) into
`<outputDir>/node_modules/` via pacote — no `npm install` shell-out, no manual
deploy step. When externals is empty, output remains a single `bundle.mjs`
(backward compatible). When non-empty, output is a self-contained directory:
`bundle.mjs`, `package.json`, `package-lock.json`, `node_modules/`.

The bundler reads npm config (registry, scope tokens) from `.npmrc`,
parallelizes manifest fetches with retry, atomically stages each package
extraction (no half-populated `node_modules/` on failure), and reuses the
closure resolution from the existing `collectAllSpecs` BFS so peerDependencies
are honored.

Hard-errors when:

- A package in the install closure declares a `pre/install/postinstall` script
  (pacote.extract does not run them).
- A step package names an external in `walkerOS.bundle.external` but does not
  list it in `dependencies` or `peerDependencies`.
- Two step packages declare the same external and the resolved version does not
  satisfy all consumers' constraints.

Warns (not errors) when:

- Bundle output contains unresolved `__dirname` / `__filename` references (with
  package attribution by hit count).
- A step package's `walkerOS.bundle.*` block contains unknown keys (typo guard).

New sibling export `downloadPackagesWithResolution` returns both the package
paths and the full `ResolutionResult`. Existing `downloadPackages` keeps its
return shape unchanged.
