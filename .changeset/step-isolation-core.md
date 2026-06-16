---
'@walkeros/core': patch
---

Add an optional `reportError` callback to the step context so any source,
transformer, store, or destination can report an out-of-band error (for example
from an SDK's event emitter) into the pipeline's failure handling. Add an
optional per-destination `breaker` config to skip a destination after repeated
transport failures.
