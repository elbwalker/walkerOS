---
'@walkeros/core': major
'@walkeros/cli': major
'@walkeros/mcp': major
'@walkeros/explorer': major
---

Flow v4: type redesign and cross-flow references.

Breaking changes:

- Renamed `Flow.Settings` (single-flow shape) to `Flow`. The new `Flow.Settings`
  is the arbitrary kv-bag inside `Flow.Config` (matches `Destination.Settings`
  semantics).
- Renamed `Flow.Config` (root file shape) to `Flow.Json`.
- Removed `Flow.Web` and `Flow.Server`. Replaced by
  `config.platform: 'web' | 'server'` (a string discriminator).
- Renamed `Flow.InlineCode` to `Flow.Code`.
- Renamed `Flow.SourceReference` / `DestinationReference` /
  `TransformerReference` / `StoreReference` to `Flow.Source` / `Destination` /
  `Transformer` / `Store` (Reference suffix dropped).
- Renamed `Flow.ContractEntry` to `Flow.ContractRule`.
- Lifted `bundle` and platform fields into the per-flow `config` block.
- `flow.json` `version` bumped from 3 to 4. v3 input is rejected (no compat
  shim).

New:

- `$flow.X.Y` reference resolves to `flows.X.config.Y` in the same file. Useful
  for linking a web flow's API destination to a server flow's deployed URL
  without duplicating values.
- Per-flow `Flow.Config` block: `{ platform, url, settings, bundle }`.
- `walkeros validate` warns on unresolved `$flow.X.Y` (use `--strict` to error).
  `walkeros bundle` and `walkeros deploy` always error on unresolved refs.
- See `docs/migrating/v3-to-v4.mdx` on the website for the manual migration
  steps. No automated codemod is shipped.
