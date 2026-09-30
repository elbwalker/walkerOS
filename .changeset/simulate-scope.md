---
'@walkeros/cli': minor
'@walkeros/config': patch
'@walkeros/core': patch
'@walkeros/mcp': minor
'@walkeros/server-destination-aws': patch
'@walkeros/server-destination-gcp': patch
'@walkeros/server-source-aws': patch
'@walkeros/server-source-express': patch
'@walkeros/server-source-gcp': patch
'@walkeros/web-source-session': patch
---

Simulate starts only the simulated step, and a simulated transformer continues
through its `next`. Source simulations list the commands a source issues as
`elb` calls; `--page-url` sets the web page. Express flows need no port.
Packages with several exports use per-export examples and mocks, and a
destination without a mock env is refused instead of calling the vendor.
