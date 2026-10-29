---
'@walkeros/web-source-browser': patch
---

The browser source's setting descriptions now match what the source does:
`scope` takes a DOM node (an Element, Document or ShadowRoot), not a selector;
`elbLayer` takes a queue name, `true` or `false`, and an array is not adopted;
`name` has no effect. They appear in the docs settings table and in MCP
`package_get`.
