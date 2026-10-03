---
'@walkeros/web-core': patch
'@walkeros/web-source-browser': patch
'@walkeros/walker.js': patch
---

Attribute values now support backslash escapes: `\'`, `\;` and `\\` keep a
quote, semicolon or backslash in the value, so `name:Men\'s shirt` works and
tagger output is read back as passed. The tagger no longer escapes colons in
values. A single backslash in existing markup now escapes the next character, so
write `\\` for a literal backslash.
