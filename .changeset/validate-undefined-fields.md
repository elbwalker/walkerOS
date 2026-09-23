---
'@walkeros/core': minor
'@walkeros/transformer-validate': patch
---

A mapping or `policy` entry that resolves to nothing now removes the field
instead of leaving an `undefined` placeholder, so a denied consent gate redacts
it. The validate transformer never throws: an engine failure becomes an issue,
and `pass` mode no longer drops events that carry such fields.
