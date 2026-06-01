---
'@walkeros/explorer': patch
---

CodeBox now memoizes its toolbar and tabs so a validation-marker update repaints
only the error and warning badges instead of re-rendering the whole editor. This
removes the visible editor flicker when content or markers change rapidly.
