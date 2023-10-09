---
title: Context
---

All entities inside a defined context want to know about their context. Those are not as relevant as globals for every event, but helpful information for every framing context of an event it's embedded in. A context could be a position or test for example.

```html
<div data-elbcontext="test:engagement" data-elbglobals="plan:paid">
  <div data-elbcontext="recommendation:smart_ai">
    <div
      data-elb="promotion"
      data-elbaction="click"
      data-elb-promotion="title:click me"
    >
      click me
    </div>
  </div>
</div>
```

The context properties are tuples with the value and an index, starting at the closest parent (`[value, index]`). Access them via `event.context.key[0]`.

```js
{
  event: "promotion click",
  data: { title: "click me" },
  globals: { plan: "paid" },
  context: {
    test: ["engagement", 1],
    recommendation: ["smart_ai", 0],
  },
  // other properties omitted
}
```