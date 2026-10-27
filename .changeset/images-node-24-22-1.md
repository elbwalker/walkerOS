---
'@walkeros/runner': patch
'@walkeros/cli': patch
---

The `walkeros/flow` and `walkeros/cli` images now run Node.js 24.22.1, which
fixes the vulnerabilities of the Node.js security release of 21 October 2026;
one of them can be triggered by a request to a flow's HTTP source. Rebuild
images based on `walkeros/flow` with this version and redeploy. Flows that run
on their own Node.js need 22.23.4, 24.22.1, 26.12.1 or later in the same line.
