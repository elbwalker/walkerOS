---
'@walkeros/cli': patch
---

Fix CLI commands hanging after completion

Commands (`bundle`, `simulate`, `push`) would hang indefinitely after completing
successfully due to open handles keeping the Node.js event loop alive.

Root cause: esbuild worker threads and pacote HTTP keep-alive connections were
not being cleaned up.

Fixes:

- Add `esbuild.stop()` after builds to terminate worker threads
- Add explicit `process.exit(0)` on successful completion for all CLI commands
