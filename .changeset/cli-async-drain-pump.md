---
'@walkeros/cli': patch
---

Fix `walkeros push` deadlock for web flows whose destinations await real timers
during init.

Previously, async-drain timer interception captured every `setTimeout` into a
pending map and only fired them via a post-`fn` flush. If a destination's init
awaited one of those captured timers (e.g.,
`@walkeros/web-destination-amplitude`'s engagement plugin awaits a 10s
setTimeout to give up on a CDN script load), `init` never resolved,
`await collector.push` deadlocked, and Node exited with
`Detected unsettled top-level await` (exit 13).

A drain pump now runs alongside `fn(flowModule)` for non-`--simulate` runs: each
tick fires every captured non-cleared timer using a real `setImmediate`
reference. Timers fire in delay-ascending order, intervals re-register, callback
errors are reported via `console.warn`. Bounded by max-iterations (1000) and
wall-clock (30s) caps.

`--simulate <step>` continues to use the post-`fn` flush path so snapshot
ordering remains stable.

Behavior change (edge case): a destination using `setTimeout` for retry backoff
under `walkeros push` (real, non-simulate) now sees its timer fire instantly.
This was already the documented contract for `--simulate <step>` snapshots; it
now extends to real `push` for consistency.
