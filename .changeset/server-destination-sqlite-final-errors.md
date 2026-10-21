---
'@walkeros/server-destination-sqlite': patch
---

A constraint error on insert is final and not retried, and a missing table named
by a rule's `table` setting is a `config` error. The legacy `schema: 'auto'`
also creates the rule tables.
