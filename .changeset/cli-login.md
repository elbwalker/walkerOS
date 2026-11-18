---
'@walkeros/cli': patch
---

`walkeros login` signs a person in with the walkerOS app in a browser, on the
sign-in host the app names (`auth.walkeros.io`), and `walkeros logout` revokes
that sign-in; with `--no-browser` the page after Allow shows a one-time code to
paste, for a container or another machine. The new `resolveCredential()` export
returns the credential a command would send, including a `walkeros login`.
