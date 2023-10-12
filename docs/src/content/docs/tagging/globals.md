---
title: Globals
---

##### What global properties are, when to use them and how

There might be properties that don't belong to just one event but to <b>all events on a page</b>. Those properties are called the globals and will be <b>collected once</b>, right before the first event got fired. The globals are arbitrary like the data property. What is special about them is that you can define them anywhere on a page by using the `data-elbglobals` attribute.

```html
<div data-elbglobals="outof:scope"></div>

<div data-elb="entity" data-elb-entity="foo:bar" data-elbaction="load:action" />
```

This example will lead to the following event:

```js
{
  "event": "entity action",
  "data": { "foo": "bar" },
  "globals": { "outof": "scope" }
  // other properties omitted
}
```

:::note[Info]
For reasons of performance, the globals are only collected once per run.
:::