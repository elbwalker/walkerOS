---
'@walkeros/web-core': patch
'@walkeros/web-source-browser': patch
'@walkeros/walker.js': patch
---

Quoted action parameters that contain a semicolon, like `add('x;y')`, parse as
one parameter again. An apostrophe inside a word, like `Men's` or `l'été`, stays
part of the value.
