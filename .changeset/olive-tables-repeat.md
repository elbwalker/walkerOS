---
'@walkeros/cli': minor
---

`walkeros login` now uses the standard device authorization grant and refreshes
its session automatically. Existing tokens keep working until they expire; run
`walkeros login` once to switch.

Breaking: `getAuthHeaders` is async, and it rejects when the session needs a
refresh that cannot be carried out rather than quietly returning no header.
`createApiClient` no longer throws when unauthenticated, the request it makes
does. Removed exports: `getToken`, `requestDeviceCode`, `pollForToken`, and the
`DeviceCodeResult`, `DeviceCodeOptions`, `PollOptions` and `PollResult` types;
`startDeviceAuthorization` and `completeDeviceLogin` replace the last two.
