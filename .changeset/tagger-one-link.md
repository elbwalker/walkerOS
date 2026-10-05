---
'@walkeros/web-source-browser': patch
---

`tagger.link()` sets the one link an element carries and throws on a second,
different link or an object with several entries. Before, it joined several
links into one `data-elblink` that the browser source could not read, so every
link on the element was lost. `getTriggerActions` and `Triggers` are now
exported.
