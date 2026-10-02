---
'@walkeros/cli': patch
---

Web bundles now leave out features the flow does not use. The minimal web flow
drops from about 115 KB to 93 KB (40 KB to 32 KB gzipped). Skeletons built by
older CLI versions still wrap with every feature.
