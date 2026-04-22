---
'@walkeros/web-source-cmp-usercentrics': minor
---

Support both Usercentrics V2 (`window.UC_UI`) and V3 (`window.__ucCmp`) APIs.
The source now performs a static consent read at init when the CMP has already
initialized — fixing the race where consent events fire before walkerOS loads.
New `apiVersion: 'auto' | 'v2' | 'v3'` setting (default `'auto'`) controls
detection. When both APIs are present, V3 is preferred. When neither is present
yet, listeners for both are registered so late-loading CMPs are still caught.
New `v3EventName` setting (default `'UC_UI_CMP_EVENT'`) allows pointing at an
admin-configured custom V3 event name.
