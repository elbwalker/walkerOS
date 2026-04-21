---
'@walkeros/cli': patch
---

Runtime fetchers (`fetchConfig`, `fetchSecrets`) now classify 401/403 responses
from the app as a typed `RunnerAuthError` with a structured `reason`
(`'unauthorised' | 'flow' | 'scope' | 'forbidden'`) and the app's error `code`
(`FORBIDDEN_FLOW` / `FORBIDDEN_SCOPE`). Callers can log a specific reason
instead of a generic "token may have expired" message, and exit cleanly rather
than retry on scope/flow mismatches.
