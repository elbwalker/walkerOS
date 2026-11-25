# @walkeros/server-destination-ga4

## 4.10.0

### Minor Changes

- acf74ba: New GA4 Measurement Protocol server destination. Server events join
  the visitor's GA4 session when the `_ga` client id and session id are mapped;
  an event without a client id gets a stable one derived from its event id. Ad
  signals follow the event's marketing consent, `timestamp_micros` is sent for
  events under 72 hours, and invalid event names fail before any request.

### Patch Changes

- Updated dependencies [61030f8]
- Updated dependencies [527c632]
- Updated dependencies [0af174a]
- Updated dependencies [61030f8]
- Updated dependencies [61030f8]
- Updated dependencies [777c48d]
- Updated dependencies [4938120]
- Updated dependencies [777c48d]
- Updated dependencies [6d59900]
- Updated dependencies [6d59900]
- Updated dependencies [e3744e4]
- Updated dependencies [28df061]
- Updated dependencies [527c632]
- Updated dependencies [ffd9795]
- Updated dependencies [425c9b0]
- Updated dependencies [777c48d]
- Updated dependencies [f1745d7]
  - @walkeros/core@4.10.0
  - @walkeros/server-core@4.10.0
