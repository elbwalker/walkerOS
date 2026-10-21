---
'@walkeros/web-destination-amplitude': patch
'@walkeros/web-destination-segment': patch
'@walkeros/web-destination-mixpanel': patch
'@walkeros/web-destination-posthog': patch
'@walkeros/web-destination-tiktok': patch
'@walkeros/web-destination-d8a': patch
---

Settings accept SDK options that the schema does not list and pass them through
to the SDK, so a newer SDK option no longer fails validation. Amplitude events
from a setup with plugins no longer carry the `amplitude-ts-unified` library
prefix.
