---
'@walkeros/cli': minor
---

Consolidate HTTP patterns into core/http.ts: apiFetch (authenticated),
publicFetch (unauthenticated), deployFetch (deploy token priority), and
mergeAuthHeaders. Remove duplicated resolveBaseUrl alias and legacy
authenticatedFetch/deployAuthenticatedFetch from auth.ts.
