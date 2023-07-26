---
title: General usage
---

import { Card, CardGrid } from '@astrojs/starlight/components';

You can implement all sorts of <b>front-end</b> user <b>events</b> easily with walker.js. From product and UX events like promotion view, filter usage, etc. to e-commerce actions like product add to carts or order complete events. The walker.js handles all <b>trigger initialization</b>s and <b>race conditions</b>, builds the <b>events with context</b>, and distributes them based on <b>consent states</b> and <b>mapping definitions</b> to any destinations.

#### Tagging a page with

```html
<!-- Generic usage -->
<div
  data-elb="ENTITY"
  data-elb-ENTITY="KEY:VALUE"
  data-elbaction="TRIGGER:ACTION"
  data-elbcontext="KEY:VALUE"
  data-elbglobals="KEY:VALUE"
/>

<!-- Example usage -->
<div data-elbglobals="language:en">
  <div data-elbcontext="test:engagement">
    <div data-elb="promotion" data-elbaction="visible:view">
      <h1 data-elb-promotion="name:Setting up tracking easily">
        Setting up tracking easily
      </h1>
      <p data-elb-promotion="category:analytics">Analytics</p>
    </div>
  </div>
</div>
```


#### Get a full event like the following as a result for instance:

```js
{
  event: 'promotion view', // combination of entity and action
  data: {
    // arbitrary set properties with the data-elb-promotion attribute
    name: 'Setting up tracking easily',
    category: 'analytics',
  },
  context: {
    // Related properties defined with the data-elbcontext attribute
    test: ['engagement', 0] // Value and order
  },
  globals: {
    // General Properties defined with the data-elbglobals attribute
    language: 'en'
  },
  user: {
    // stored user ids (manually added once)
    id: 'userid',
    device: 'cookieid',
    session: 'sessionid',
  },
  nested: [], // all nested entities within the promotion
  consent: { functional: true }, // status of the consent state(s)
  id: '1647968113641-01b5e2-5', // timestamp, group & count of the event
  trigger: 'visible', // name of the trigger that fired
  entity: 'promotion', // entity name
  action: 'view', // entity action
  timestamp: 1647968113641, // time when the event fired
  timing: 3.14, // how long it took from the page load to trigger the event
  group: '01b5e2', // random group id for all events on a page
  count: 2, // incremental counter of the events on a page
  version: {
    // Helpful when working with raw data
    walker: 1.5, // used walker.js version
    config: 42, // a custom configuration version number
  },
  source: {
    // Origins of the event
    type: 1, // Source type of the event (1=Web)
    id: 'https://github.com/elbwalker/walker.js', // Source id of the event's origin (url)
    previous_id: 'https://www.elbwalker.com/' // Previous source id of the event's origin (referrer)
  },
  walker: true, // flag to filter events
}
```

You are completely <b>free to define naming conventions</b>. All you need to get started are the <b>entity, action & trigger</b> attributes. Learn more about the [elbwalker event modell](https://www.elbwalker.com/blog/elbwalker-event-concept/)in our blog.
1. You define the <b>entity scope</b> by setting the data-elb attribute with the name of an entity to an element, e.g. `data-elb="promotion"`. The default entity page, when there is no data-elb.
2. An <b>action</b> can be added by setting the data-elbaction attribute on the <b>same level or all child</b> elements in combination with a <b>matching trigger</b>, e.g. `data-elbaction="visible:view"` to fire a promotion view event when a user clicks on the tagged element. 
3. (Optional) To define the entities' <b>properties</b>, set the <b>composited attribute</b> data-elb-ENTITY with the name and value, e.g. `data-elb-promotion="name:Setting up tracking easily;position:overlay"`.

#### Linking elements

Use the `data-elblink` tag to extend the scope of an entity by other elements, placed somewhere else (like modals). Linked elements are related by some id. They are hierarchically and can either be a parent or a child.

```html
<div data-elb="info" data-elblink="details:parent"> ... </div>
...
<div data-elblink="details:child" data-elbaction="visible"> ... </div>
<p data-elblink="another:child"> ... </p>
```

The second element is the parent, triggering the visible action for the `info visible` event. There can be multiple children, but only one parent element per id.

:::note[Info]
data-elb, data-elbaction data-elbcontext, data-elbglobals, and data-elblink are reserved attributes whereas data-elb-* attributes may be arbitrary combinations based on the related entity name. Actions and properties can be set anywhere inside an elb scope.
:::
:::caution[Caution]
Spaces in entities, e.g. "shopping cart" or actions, e.g. "add to cart" will be replaced by underscores to "shopping_cart" and "add_to_cart".
:::

:::tip[Tip] 
Spaces in property values are no problem, e.g. "<b>category: 'summer sale'</b>" works fine. But better set them in quotes when doing so or when using symbols, especially : or ; 
:::

See more 🧑‍🎓 [tagging examples](https://www.elbwalker.com/gallery/) and learn how to tag your website.