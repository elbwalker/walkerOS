---
'@walkeros/core': patch
'@walkeros/cli': patch
'@walkeros/runner': patch
---

A server artifact now names the secrets and environment values its flow reads.
The runner sets only those names, refuses a reserved or already set name, masks
every declared value and reports its release. A name the app delivers that the
flow reads only from code (a `$code:` value, or a package that reads
`process.env` itself, such as an SDK's default credential name) is no longer
set. The reserved names include every `LD_` and `DYLD_` name.

Migration: a name that is both in the environment and in the app now stops the
boot, so keep one source. App values are now set after the artifact is imported
and before it starts, so a package that reads such a name at import time no
longer sees it, while inline code is not affected.
