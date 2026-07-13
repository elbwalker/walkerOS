---
'@walkeros/web-source-browser': minor
'@walkeros/web-core': minor
---

The `impression` and `visible` triggers now count an element as seen when at
least half of it, or half of the viewport, whichever is smaller, is on screen
along each axis for one continuous second in a foreground tab. Elements larger
than the viewport now fire, where previously they could not, and elements are
detected reliably when a framework injects them before rendering. Expect an
increase in impression volume, particularly on small viewports and on pages with
tall sections.
