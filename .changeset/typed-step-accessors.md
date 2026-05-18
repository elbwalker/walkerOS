---
'@walkeros/core': patch
---

Add typed accessors `Source.getSource`, `Destination.getDestination`,
`Transformer.getTransformer`, `Store.getStore`. Each takes a collector and a
step id and returns the registered instance with its declared generic recovered,
replacing the `Elb.Fn`-collapsed shape that the bag's index signature exposes on
read.

Callers (mainly tests and integrations that invoke a step's raw `push` through
the collector) no longer need `as any` / `as (rawData: X) => ...` casts at this
boundary. Each helper throws `<Kind> not found: <id>` for unknown ids. No
runtime behavior change.
