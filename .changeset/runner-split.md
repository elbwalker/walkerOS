---
'@walkeros/runner': minor
'@walkeros/cli': minor
---

`walkeros run` is removed, with no alias. Build a flow with `walkeros bundle`,
then start the prebuilt artifact with `runneros start dist/flow.mjs`. The new
`@walkeros/runner` package ships the `runneros` binary without esbuild, pacote,
jsdom or nft, and the `walkeros/flow` image now runs it.
