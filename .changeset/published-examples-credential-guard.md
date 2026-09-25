---
'@walkeros/config': patch
---

Package builds now fail when a published example, export example or hint
contains something that looks like a real credential, such as a PEM private key
or a live API token. The error names the package and the JSON path, never the
value, and suggests a placeholder.
