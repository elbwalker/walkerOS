---
'@walkeros/cli': patch
---

The CLI authenticates with a token only: create one under Account > Automation
tokens and set `WALKEROS_TOKEN`. `walkeros auth login`, `logout` and `token` are
removed, with the stored session and their exports. An old sign-in in the config
file is no longer read, and `walkeros api` refuses an `Authorization` header.
