---
'@walkeros/explorer': minor
---

IntelliSense improvements for flow.json editors:

- Chain references (`next` / `before`) now autocomplete in all forms: scalar,
  inline array, multi-line array, and Route[] inner `next`. Previously only the
  scalar form triggered.
- `$store.` completions, hover, and validation added. Fed by a new optional
  `stores` field on `IntelliSenseContext`; the flow extractor collects store IDs
  from the active flow.
- `$env.` completions and hover added. Optional `envNames` inventory on
  `IntelliSenseContext` enables validation; when absent, `$env.` still gets a
  generic hover.
- `$contract.` completion now only triggers when the cursor starts a new string
  value, matching runtime semantics (whole-string refs only).
- `package` completion detection is JSON-path aware — multi-line `"package":`
  values now surface completions.
- Variables and definitions are collected at config / flow / step levels with
  correct cascade priority (step > flow > config).
- Markers validate chain references in all forms via a JSON walk instead of a
  scalar-only regex.
- Internals now import the shared `REF_*` regex constants from `@walkeros/core`
  — single source of truth, no inline duplicates.
