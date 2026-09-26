---
'@walkeros/config': patch
---

Package builds now fail when a published example, export example or hint
contains something that looks like a real credential, such as a PEM private key,
a live API token or a GitHub token (`github_pat_`, `ghu_`, `ghs_`, `ghr_`), also
as an object key. The error names the package and JSON path, never the value,
and suggests a placeholder.
