---
'@walkeros/web-source-browser': patch
---

`elb` takes an event object,
`elb({ name, data, trigger, context, nested, custom })`, or a `walker` command.
The string form `elb('entity action', data)` still works and sends exactly
`{ name, data }`. Any argument after `data` or after the event object, and
`data` that is not an object (such as an element), is ignored and reported as an
error: put trigger, context, nested and custom inside the event object. The
types `BrowserArguments`, `BrowserPushData`, `BrowserPushOptions` and
`BrowserPushContext` are removed.

The automatic page view uses the path as `data.id` unless the page tags an id; a
page event you push keeps its `data` as written. `elb` no longer writes `source`
or `globals` onto the event or `data` object you pass in.

An event that carries its own `globals` keeps the globals tagged on the page as
well; the event's values win per key.
