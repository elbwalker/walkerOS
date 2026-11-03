---
'@walkeros/server-destination-sqlite': patch
---

The `settings.sqlite.schema` description states what each value does: `auto`
creates the table at the first push with the columns every insert writes, and
`manual` skips the table check. The step examples carry event timestamps in
milliseconds.
