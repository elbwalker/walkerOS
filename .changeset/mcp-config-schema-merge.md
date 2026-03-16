---
'@walkeros/core': minor
'@walkeros/mcp': minor
---

Add mergeConfigSchema to core and integrate into MCP package_get tool.

package_get now returns schemas.config — a merged JSON Schema combining base
config fields (require, consent, logger, mapping, etc.) from core with the
package's typed settings schema. Runtime-only fields (env, onError, onLog) are
excluded.
