---
'@walkeros/server-destination-aws': patch
---

The Firehose destination no longer discards every config field except `settings`
during init, which silently dropped `before`, `consent`, `mapping`, `data` and
`next`. A `before` transformer chain configured on the destination never ran,
and a `consent` requirement was never enforced. The SNS destination in the same
package was already correct.
