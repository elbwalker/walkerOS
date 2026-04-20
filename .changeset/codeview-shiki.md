---
'@walkeros/explorer': minor
---

Add `CodeView` (Shiki-backed read-only code display) with matching `Box` frame,
plus a `CodeStatic` atom as the underlying highlighter. Also suppress the Monaco
loader's `{type: 'cancelation'}` unhandled rejections globally via a single
window-level listener, fixing the dev-console noise that fired on every unmount
of a `<CodeBox>` consumer.
