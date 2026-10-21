---
'@walkeros/server-destination-clickhouse': patch
---

A failed insert carries its ClickHouse code or network error and, for a missing
table or too many parts, the fix in its message. The destination no longer logs
a line of its own, and the server's text stays out of the message. Rules with
`silent: true` insert nothing.
