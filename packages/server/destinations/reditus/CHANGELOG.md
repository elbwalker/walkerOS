# @walkeros/server-destination-reditus

## 4.10.0

### Minor Changes

- 70f5fe9: New Reditus server destination for affiliate and referral programs.
  Each rule sends a referral conversion (`POST /v2/tracking/conversion`, with an
  affiliate or advocate slug) or a payment (`POST /v1/payments`, amount in
  cents, keyed by the payment processor's payment id). An existing referral
  (409), a payment Reditus already has (400) or a customer who was never
  referred (404) counts as delivered, and any other refusal fails the event.

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
