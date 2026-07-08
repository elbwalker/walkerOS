---
'@walkeros/web-core': minor
'@walkeros/web-source-browser': minor
---

The visible and impression triggers now fire for elements inside open shadow
DOM, and scroll depth is computed correctly for shadow-nested elements.
Visibility still accounts for occlusion across open shadow roots, so a genuinely
covered element does not trigger. Closed shadow subtrees can be tracked by
passing the closed root reference to walker init.
