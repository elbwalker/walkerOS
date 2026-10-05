---
'@walkeros/explorer': patch
---

Importing explorer no longer downloads the Monaco editor. Monaco now loads when
the first code editor appears on a page, so pages without an editor stay light.
Editors keep their themes, type checking and autocompletion.
