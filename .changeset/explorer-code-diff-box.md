---
'@walkeros/explorer': patch
---

Add `CodeDiff` atom and `CodeDiffBox` molecule — read-only, theme-aware Monaco
`DiffEditor` wrappers for side-by-side / inline code diff viewing. `CodeDiffBox`
mirrors `CodeBox`'s API (header, actions, traffic lights, footer) and adds an
opt-in summary strip, split/inline toggle, and copy button. Supports any Monaco
language; walkerOS `$var:` / `$secret:` decorations are applied to both sides
automatically.
