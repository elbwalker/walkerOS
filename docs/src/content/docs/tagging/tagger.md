---
title: Tagger
---

The Tagger is a helper to generate the `data-elb` attributes.

:::note[Info]
The Tagger will support tagging validation and other features soon. It's worth using it.
:::

Start by installing the tagger with npm:

```js
npm i --save @elbwalker/tagger
```

Import, instantiate and use the tagger

```js
import Tagger from '@elbwalker/tagger';

const tagger = Tagger();
tagger.entity('promotion'); // { "data-elb": "promotion" }
tagger.action('visible', 'view'); // { "data-elbaction": "visible:view" }
tagger.property('promotion', 'category', 'analytics'); // { "data-elb-promotion": "category:analytics" }
tagger.context('test', 'engagement'); // { "data-elbcontext": "test:engagement" }
tagger.globals('language', 'en'); // { "data-elbglobals": "language:en" }
```

You can use the return values to add them directly to your HTML. Use the spread operator in React:

```html
<div
  {...tagger.entity('promotion')}
  {...tagger.action('visible', 'view')}
  {...tagger.property('promotion', 'name', 'Setting up tracking easily')}
  className="overlay"
>
```