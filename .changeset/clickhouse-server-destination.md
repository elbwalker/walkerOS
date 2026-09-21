---
'@walkeros/server-destination-clickhouse': minor
---

New ClickHouse server destination. Events are written in bulk as JSONEachRow
inserts into a table you create and own, with a bounded retry made safe by an
insert deduplication token. A column your table is missing fails the batch
loudly instead of dropping the field. The README carries the reference table
DDL.
