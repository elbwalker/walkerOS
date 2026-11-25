# @walkeros/server-destination-gravity

## 4.10.0

### Minor Changes

- e625fe8: New Gravity server destination for the Conversions API of ads in AI
  assistants. The mapped event name is the Gravity event (standard or custom);
  the Gravity pixel's user data and the click parameters are passed through
  unchanged, email, phone and names are normalised and SHA-256 hashed, and an
  `error` status inside a 200 answer fails the push. `test_event_code` validates
  events without recording them.

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
