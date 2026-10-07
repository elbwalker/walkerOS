A native `<details>` disclosure for one FAQ question, stacked 12px apart (max 900px).

`surface` + `border`, `radius-faq`. The question is 17px/600 with a `fg-3` plus that becomes a minus when open; the answer sits under a `border` rule in `fg-2`, paragraphs max 72ch.

**Consumer provides:** `question`, `children` (a string or an array of paragraph strings/nodes), optional `open`.

Answer the question that was actually asked, and include an honest caveat where one exists.
