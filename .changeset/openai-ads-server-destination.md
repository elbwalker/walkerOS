---
'@walkeros/server-destination-openai-ads': minor
---

New OpenAI Ads server destination for the Conversions API of ads in ChatGPT. The
mapped event name is the OpenAI event type (standard or custom); email, phone
and external id are normalised and SHA-256 hashed, the `oppref` click reference
and pixel `obref` are passed through, amounts are sent in minor units, and the
walkerOS event id deduplicates. `validate_only` tests a flow without recording
conversions.
