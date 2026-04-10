---
'@walkeros/core': minor
'@walkeros/collector': minor
---

Add `skip?: boolean` to `Mapping.Rule` as a universal sibling of `ignore`.
Destinations can now honor a rule-level `skip` to process `settings.*` side
effects (identify, revenue, group, etc.) while omitting their default forwarding
call (`track()`, `capture()`, `event()`). Replaces destination-specific
`settings.skipTrack` / `settings.skipEvent` toggles.

`processEventMapping()` now returns an explicit `skip: boolean` field alongside
`ignore`. The collector does not short-circuit on `skip` — it still calls
`destination.push()` so the destination can run its side effects. The
destination implementation reads `context.rule?.skip` and gates its default
forwarding call on `!skip`.

`ignore: true` still wins when both flags are set on the same rule.
