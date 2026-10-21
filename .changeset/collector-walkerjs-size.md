---
'@walkeros/collector': patch
---

The web bundle `walker.js` carries the full failure contract, the circuit
breaker included. It grows from 35,181 bytes to 39,334 bytes, measured as gzip
-9, and its size is not gated by a budget.
