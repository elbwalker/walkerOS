---
'@walkeros/explorer': patch
---

Read-only code boxes (`CodeView`, `CodeSnippet`) now size to their content
instead of a fixed height, and snippets show a copy button. New `StepExample`
shows a step's event, mapping and output side by side, wrapping to a stack on
narrow screens. `Grid` now honors `columns`: at most that many boxes per row,
the rest wrap.
