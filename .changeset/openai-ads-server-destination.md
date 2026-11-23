---
'@walkeros/server-destination-openai-ads': minor
---

New OpenAI Ads server destination for the Conversions API of ads in ChatGPT.
Page views, product views, product adds and completed orders are sent as
OpenAI's standard events by default, a mapping rule's name sets any other
standard or custom type, and an event without one is not sent; email, phone,
external id and names are normalised and SHA-256 hashed, the `oppref` click
reference and pixel `obref` are passed through, and amounts are sent in ISO 4217
minor units. A mappable `id` deduplicates against the OpenAI pixel, and
`validate_only` tests a flow without recording conversions.
