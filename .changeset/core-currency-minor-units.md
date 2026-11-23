---
'@walkeros/core': patch
---

`getCurrencyMinorUnits` returns the ISO 4217 minor unit of a currency code, such
as 2 for EUR, 0 for JPY and 3 for KWD, and nothing for a code that is not on the
ISO list. Destinations that send amounts in minor units use it instead of the
runtime's locale data, which differs from ISO for HUF, IDR, COP and other
currencies.
