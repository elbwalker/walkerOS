---
'@walkeros/explorer': patch
---

Read-only code blocks (`CodeView`, `CodeSnippet`, `StepExample`) now name their
language on the rendered `<code>` element, so Markdown converted from the page
keeps each code fence's language, including languages that render as plain text.
