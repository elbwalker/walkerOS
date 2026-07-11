---
'@walkeros/cli': patch
---

Bundling a flow whose step `package` carries an inline version (e.g.
`@walkeros/web-source-browser@2.1.0`) no longer fails package resolution: the
version suffix is parsed and honored instead of being treated as part of the
package name, and an explicit `config.bundle.packages` pin still wins. The
elbPreview loader now activates previews via a script-element swap instead of a
CORS-bound fetch probe, so previews work on any site regardless of CDN CORS
headers. The flow runtime also buffers bundle archives fully before extraction,
fixing a rare boot crash when the download stream ended while extraction had it
paused.
