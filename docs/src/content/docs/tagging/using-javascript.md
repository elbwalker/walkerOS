---
title: Using JavaScript (elb)
---

###### How to use JavaScript to track events

Walker.js uses the elbLayer to handle all events. It is possible to also trigger custom events manually using JavaScript:

```js
import { elb } from '@elbwalker/walker.js';
elb('entity action', data, trigger, context, nested);
```

Both <i>entity</i> and <i>action</i> are combined in one string separated by space and required. The optional data object holds all properties of an entity. The [trigger](https://docs.elbwalker.com/tagging/available-triggers) is optional and is expected to be a string.

#### Examples

```js
// Virtual page view of an overlay popup
elb('page view', { id: '/overlay/login', name: 'Log In' }, 'visible');

// Add to cart
elb('product add', { name: 'Everyday Ruck Snack' });

// Just an event
elb('application confirm');

// Use data and context from elements in DOM
const elem = document.getElementById("entity") // the 'form' entity element 
elb('form send', elem); // Get data and context from DOM
elb('form send', { data: "static" }, 'custom', elem); // Only get context from DOM
```

The full `elb`-function interface requires the event and accepts additional parameters for `data`, `trigger`, `context`, and `nested`

```js
interface Elb {
  (
    event: string,
    data?: PushData,
    trigger?: PushOptions,
    context?: PushContext,
    nested?: Walker.Entities,
  ): void;
}

elb(
  'entity action', // event
  { foo: 'bar' }, // data
  'custom', // trigger
  { test: ['a', 0] }, // context
  [
    // nested
    {
      type: 'child',
      data: { iam: 'nested' }
    }
  ]
);
```

:::caution[Caution]
When working directly with the elbLayer make sure to initialize it properly by writing the following line before making use of the push method: `elbLayer = elbLayer || [];`
:::