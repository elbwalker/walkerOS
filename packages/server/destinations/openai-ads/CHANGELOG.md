# @walkeros/server-destination-openai-ads

## 4.10.0

### Minor Changes

- 99852d5: New OpenAI Ads server destination for the Conversions API of ads in
  ChatGPT. Page views, product views, product adds and completed orders are sent
  as OpenAI's standard events by default, a mapping rule's name sets any other
  standard or custom type, and an event without one is not sent; email, phone,
  external id and names are normalised and SHA-256 hashed, the `oppref` click
  reference and pixel `obref` are passed through, and amounts are sent in ISO
  4217 minor units. A mappable `id` deduplicates against the OpenAI pixel, and
  `validate_only` tests a flow without recording conversions.

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
