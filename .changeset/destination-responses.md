---
'@walkeros/core': minor
'@walkeros/collector': minor
---

Simplify PushResult structure and enable destination response data

- Changed `PushResult` from array-based (`successful[]`, `queued[]`, `failed[]`)
  to object-based (`done?`, `queued?`, `failed?`) with
  `Record<string, Destination.Ref>` structure
- Updated `Destination.Ref` from `{ id, destination }` to
  `{ type, data?, error? }` to capture response data from destinations
- Changed `Destination.PushFn` return type from `void` to `void | unknown`
  allowing destinations to return response data
- Added `createPushResult()` helper function for standardized result creation
- Results are now keyed by destination ID for easier access (e.g.,
  `result.done?.myDestination`)
