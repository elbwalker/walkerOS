---
'@walkeros/core': patch
'@walkeros/collector': patch
'@walkeros/cli': patch
'@walkeros/mcp': patch
---

Flow v4 routing & cache cleanup.

**Cache:**

- `cache.full` is renamed to `cache.stop`. Search-and-replace.
- `cacheRule.match` is now optional. Omitted means always-match. The literal
  `'*'` is dropped from the schema and the TypeScript types; `compileMatcher`
  still tolerates the string at runtime for migration.
- New `cache.namespace?: string` field. Omit to write keys directly to the
  store. Same store + same key + same namespace = same cache entry.
- Implicit per-step namespace prefixes (`s:`, `t:`, `d:`) are removed. If you
  relied on them to separate same-keyed caches across
  sources/transformers/destinations using the same store, set `cache.namespace`
  explicitly.

**Routing:**

- Unified recursive `Route` type. A Route is `string | Route[] | RouteConfig`.
- New `case` operator replaces the legacy `Route[]` first-match shape. The
  legacy shape is compiled as an implicit `{ case: [...] }` for runtime
  compatibility, but new configs should use `case` explicitly.
- `RouteConfig` is a disjoint union enforced at the TypeScript type level via
  `never` fields: a single RouteConfig sets at most one of `next` / `case`. A
  bare `{ match }` is a gate (pass-through when the match fires, fall-through
  when it fails). JSON Schema validation currently emits `anyOf` and does not
  enforce disjointness at runtime — see follow-up notes.
- Sequence sugar (`next: [A, B, C]`) is preserved.

**Path:**

- A transformer entry with no `code` is a `path` — a code-less passthrough. The
  engine synthesizes `(e) => ({ event: e })`. Use paths to name and share
  `before` chains across destinations. Validation: a path must declare at least
  one of `package`, `before`, `next`, or `cache`.

**Schema & tooling:**

- Updated Zod schemas (cache, route, matcher).
- Updated MCP tool descriptions and resource references.
- Updated `flow_validate` to enforce the new constraints (`EMPTY_TRANSFORMER`
  error code added).

**Migration:** Hard cut at the schema/type level. Configs using `cache.full`
will fail validation — rename to `stop`. Configs using `match: "*"` will fail
validation — omit `match`. Configs using `Route[]` first-match still work at
runtime (compiled as implicit `case`) but new configs should use `case`
explicitly.

`$schema: "v4"` is preserved. No version bump.
