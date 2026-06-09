---
'@walkeros/collector': patch
---

Lifecycle dispatch now fails closed when called with a non-collector argument.
If an internal function is ever reached by foreign code (for example a global
name collision), it returns quietly instead of throwing, so it can no longer
break the surrounding page.
