---
'@walkeros/core': patch
---

`@walkeros/core/dev` exports `toSerializable`, which turns a value into what
`walkerOS.json` publishes: functions become `{ $code }` objects with their
source text, Zod schemas are left out, and everything else is copied. The
package build and the step example runner both use it, so tests run what is
published.
