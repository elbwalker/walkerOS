---
'@walkeros/web-source-cmp-usercentrics': patch
---

Use the official Usercentrics events (UC_UI_INITIALIZED, UC_UI_CMP_EVENT) and
consent getters so a returning visitor's prior choice is applied on load and
first-visit defaults stay suppressed under explicitOnly. The configurable
eventName data-layer setting is removed; the source now uses the always-emitted
official events. Fixes consent-change events being dropped on the current
Usercentrics Web CMP.
