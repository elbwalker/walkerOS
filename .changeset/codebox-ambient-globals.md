---
'@walkeros/explorer': minor
---

`<CodeBox>` and `<LiveCode>` now run with Monaco configured to `target: ES2022`,
`module: ESNext`, `moduleDetection: 'force'`, and a registered ambient
declarations file exposing walkerOS runtime globals (`elb`, `getMappingEvent`,
`getMappingValue`). Mapping snippets can be plain object literals or top-level
`await` calls — no `import` / `export` boilerplate required — while keeping full
IntelliSense via the existing `@walkeros/core` type registration.

`<LiveCode>` now renders its result panel as JSON (it's always vendor output,
regardless of the input language) and its config panel as JSON (it's always
data). Only the input panel respects the `language` prop.
