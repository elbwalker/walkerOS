---
title: Nested entities
---

##### How to implement nested entities

A `data-elb` entity within another `data-elb` entity is called a <b>nested entity</b>. 

The walker runs through the nested entities and treats them like regular entities by gathering all related information. Nested entities are accessible in the nested array of each event. Each element is a regular entity.

```html
<div data-elb="mother" data-elb-mother="label:caring" data-elbaction="load:view">
  <div data-elb="son" data-elb-son="age:23"></div>
  <div data-elb="daughter" data-elb-daughter="age:32">
    <div data-elb="baby" data-elb-baby="status:infant"></div>
  </div>
</div>
```

This example will lead to the following event on load:

```js
{
  "event": "mother view",
  "data": { "label": "caring" },
  "nested": [
    { "type": "son", "data": { "age": 23 } },
    {
      "type": "daughter",
      "data": { "age": 32 },
      "nested": [{ "type": "baby", "data": { "status": "infant" } }],
    },
    { "type": "baby", "data": { "status": "infant" } },
  ],
  // other properties omitted
}
```

Nested entities that are nested inside another entity will be captured on both levels.

:::caution[Caution]
Nested entities are not available for auto-captured page view events.
:::