---
'@walkeros/cli': patch
---

Unify duplicated CLI patterns for reliability and consistency

- Add unified event validator with graduated levels (strict/standard/minimal)
- Fix package resolution in simulate to respect packages.path from flow config
- Extract shared readStdinToTempFile utility, remove copy-paste dynamic imports
- Standardize duration output to milliseconds (matching MCP schema contract)
- Fix temp file cleanup in run command (hot-swap accumulation, shutdown handler)
- Fix simulator bare /tmp cleanup bug
