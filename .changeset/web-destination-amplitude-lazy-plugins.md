---
'@walkeros/web-destination-amplitude': patch
---

Amplitude loads each plugin package only when that plugin is enabled. The
package now imports cleanly under Node and tsx, so simulation and tooling no
longer fail on a browser-only plugin that the flow never uses.
