---
'@walkeros/core': minor
'@walkeros/collector': minor
'@walkeros/runner': minor
---

`status.destinations[id].count` and `status.out` count delivered events, one per
event for a single push, a batch and a before-chain fan-out alike. A rule's
`ignore: true` now counts in `status.destinations[id].ignored`, and `skipped`
counts consent skips only. `status.dropped` also holds the routine drops at the
source and collector positions (`consent`, `ignored`, `stopped`), and
`destinations[id].latency` is a delivery latency histogram (`LATENCY_BOUNDS_MS`
and `latencyBucket` are exported by `@walkeros/core`).

Migration:

- An alarm that sums every entry of `status.dropped` now fires on intended
  drops. Read the `queue` and `dlq` counters for buffer overflow.
- A consumer that read `skipped` for rule ignores reads `ignored`.
- A destination's counts, failure lines and cause steps sit under `config.id`,
  else its key. A destination whose `config.id` differs from its key now counts
  everything under the id.
- A destination-level drop (a `before` chain drop, a cache hit) is still counted
  nowhere.
