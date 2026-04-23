---
'@walkeros/cli': patch
---

Validate device-code and token responses from the auth server with Zod schemas
at the trust boundary in `login/index.ts`. Malformed responses now surface as
structured errors instead of being trusted into config writes or browser
launches. Replaces the hand-rolled type guards for Items 1 and 3 of the cli-auth
feedback review. No public API change.
