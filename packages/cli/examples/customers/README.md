# customers

Fake demo customers for the `customers` store of `flow-complete.json`
(`@walkeros/server-store-fs`, structured mode). One file per customer id; the
content is the customer's lifetime value as JSON.

- `cust-42`: `420`
- `cust-1001`: `75.5`

Not covered by root `include`, so no customer data ships in a bundle. `basePath`
defaults to `./customers`, relative to the working directory: run
`walkeros push` from `packages/cli/examples`, or set `CUSTOMERS_DIR` to this
folder's absolute path (always for `runneros start`, which runs inside the
artifact folder).

In production the store is swapped for a real one, e.g.
`@walkeros/server-store-sheets` or a GCS store; the `loadUser` step does not
change.
