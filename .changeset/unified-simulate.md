---
"@walkeros/cli": minor
"@walkeros/collector": minor
"@walkeros/mcp": minor
---

Unify simulation for sources, destinations, and transformers through the push
command.

- All step types simulate via `push` with auto-env loading and call tracking
- Add `--simulate transformer.X` to invoke a transformer directly with an event
- Before chains run as mandatory preparation; next chains are skipped
- Source simulation captures at the collector.push boundary, preserving the
  full before chain
- Hooks (prePush/postDestinationPush) capture events instead of manual overrides
- Timer interception flushes setTimeout/setInterval deterministically for
  async patterns (debounced batches, detached Promise chains)
- MCP migrated to the push-based simulation pipeline
- Legacy simulate code removed
