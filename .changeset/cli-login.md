---
'@walkeros/cli': patch
---

`walkeros login` signs a person in with the walkerOS app in a browser, and
`walkeros logout` revokes that sign-in; with `--no-browser` the page after Allow
shows a one-time code to paste, for a container or another machine.
`WALKEROS_TOKEN` stays the credential for CI and wins while it is set. The new
`resolveCredential()` export returns the credential a command would send,
including a `walkeros login`; `resolveAccessToken()` still reads
`WALKEROS_TOKEN` only.
