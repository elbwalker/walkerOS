---
'@walkeros/server-destination-datamanager': minor
---

Data Manager follows Google's current API: `testEventCode`, `batchSize`,
`batchInterval` and the Display & Video 360 account types are removed (a flow
that still sets `testEventCode` now ingests real events, so test with
`validateOnly: true`), account IDs are digits only, `loginAccount` is accepted,
and a Google Analytics destination needs no `transactionId` and sends no IP or
user agent unless you set one. Identifiers follow Google's formatting rules (a
phone number needs `+` or `00` and its country code, a value that is already
hashed is not hashed again, an incomplete address is not sent), and a refused
request, a value the destination cannot send and a field Google drops are each
named on an ERROR line; the push returns Google's `requestId`. Tests and
simulations that injected `env.fetch` now inject `env.sendServer`, an injected
`env.authClient` now answers `getRequestHeaders()` instead of
`getAccessToken()`, and the exported types no longer include API fields and
request-status types the destination never sends.
