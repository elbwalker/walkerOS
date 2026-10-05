---
'@walkeros/mcp': patch
---

`ToolClient.credentialSource()` can return `'host'` for a door the host
authenticates per request. There, `auth` reports the connection as logged in,
answers `login` with "no login needed" and refuses `logout`. The `auth` tool no
longer changes `process.env`; the local door clears `WALKEROS_TOKEN` itself.
`auth logout` answers `loggedOut: false` when a credential is still there
afterwards, such as a session stored by a parallel login.
