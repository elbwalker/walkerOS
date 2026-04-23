---
'@walkeros/mcp': minor
---

Tool handlers now wrap user-writable strings (flow/project names, config fields,
validation messages) in `<user_data>…</user_data>` delimiters so chat consumers
can keep prompt-injection defence-in-depth. Two new utilities are exported:
`wrapUserData(s)` and `redactNestedStrings(obj)`.
