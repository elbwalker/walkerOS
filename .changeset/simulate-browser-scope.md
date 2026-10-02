---
'@walkeros/web-source-browser': patch
'@walkeros/cli': patch
---

Simulated click and impression examples of the browser source carry `source` and
`globals` again. A page scope from another realm, such as an iframe or a
simulated page, is now recognized. Simulate also exposes `Node`, `Element`,
`HTMLElement`, `Document` and `ShadowRoot`, so `instanceof` checks behave as in
a browser.
