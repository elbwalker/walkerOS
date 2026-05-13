---
'@walkeros/core': minor
'@walkeros/collector': minor
'@walkeros/cli': patch
'@walkeros/mcp': patch
---

Route grammar: rename `case` to `one` (first-match dispatch) and add `many`
(all-match parallel fan-out, pre-collector only). `many` terminates the main
chain and is rejected at post-collector positions (`destination.before`,
`destination.next`); use multiple destinations for post-collector fan-out.
`RouteCaseConfig` is renamed to `RouteOneConfig`; no aliases.
