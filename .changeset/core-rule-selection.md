---
'@walkeros/core': minor
---

New core helpers `matchMappingRule`, `getMappingCandidates`,
`getRequiredConsent` and `checkConsent` (with its `ConsentCheck` type).
`processEventMapping` takes an optional selected rule, and queued destination
entries carry the rule they were selected with (`match`). The unused
`Destination.Push` type is removed.
