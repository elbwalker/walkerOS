---
'@walkeros/collector': patch
---

`elb` takes an event object,
`elb({ name, data, trigger, context, nested, custom })`, a command,
`elb('walker <command>', data)`, or the string form
`elb('entity action', data)`. The positional `context`, `nested` and `custom`
arguments are gone, and a second argument after an event object is no longer
merged into `data`. Such arguments are ignored and reported as an error. The
string form takes `data` only when it is a plain object; before, any non-array
object, such as an element or a date, was taken.
