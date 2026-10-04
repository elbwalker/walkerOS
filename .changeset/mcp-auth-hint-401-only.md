---
'@walkeros/mcp': patch
'@walkeros/cli': patch
---

A tool refused for a missing role, scope or feature no longer suggests logging
in; that hint now appears only when the login is rejected or missing. Project
commands now report error codes such as `FORBIDDEN` in the machine-readable
error line and show upgrade instructions when the app needs a newer CLI.
