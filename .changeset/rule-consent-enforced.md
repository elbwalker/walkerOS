---
'@walkeros/core': minor
'@walkeros/collector': minor
'@walkeros/mcp': minor
---

A mapping rule's `consent` is enforced on top of the destination's: matched
events wait (web) or are skipped (server) until both are granted; a source drops
them. Destinations select the rule as the event enters, so `before` chains,
`state` and `policy` no longer change it; a `before` rename onto another rule
logs ERROR `rule-not-applied`. walker.js grows about 1.3 KB.
