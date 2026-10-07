---
'@walkeros/web-destination-plausible': patch
---

The custom event step example now sends scalar `props` only. Plausible accepts
no arrays or objects as prop values and expects `revenue` as
`{ currency, amount }`, as the purchase example shows.
