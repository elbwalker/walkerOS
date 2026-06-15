---
'@walkeros/collector': patch
---

Enforce consent gating on destination initialization. A destination that
declares a consent requirement is never initialized while that consent is
denied, including the path that flushes queued `on` (consent) signals.
Initialization is now fail-closed: it requires an affirmative consent decision
from the caller, so a destination cannot load or send under denied consent.
