---
'@walkeros/server-destination-clickhouse': patch
---

`credentials` takes a `{ token }` in place of `{ username, password }`, sent as
`Authorization: Bearer`, for an endpoint that takes one, such as a proxy in
front of ClickHouse. A token beside a username or password, an empty token and
an `access_token` in the query of `settings.url` fail init with code `config`.
The `@clickhouse/client` logger is off unless `settings.clickhouse.log` sets it,
and a refusal of the walkerOS data proxy is quoted in the failure.

Migration: a path in `settings.url` is now the path every insert is sent to.
Before, the client read it as the database and it overrode `settings.database`.
Name the database in `settings.database`.
