---
title: Triggers
---

Walker.js comes with a bunch of pre-built triggers.

You don't have to deal with event listener or mutation observer initialization anymore. Walker.js comes with a bunch of integrated triggers that will fire your event at the right moment.

<b>hier fehlt die Tabelle</b>

:::caution[.]
Trigger names are predefined and need to be selected from the list while the `action` can be an arbitrarily defined name.
:::

#### Abbreviation

If the trigger and action values are equal, e.g. for click events, you can just shorten the implementation:

```js
<b data-elbaction="click">short</b> is equal to <s data-elbaction="click:click">long</s>
```

#### Parameters

Some triggers require more information during their initialization, others accept optional parameters. A scroll trigger needs to know about the percentage a user scrolls down while a wait trigger wants to know about the number of milliseconds until the action gets triggered. Use brackets behind the trigger to pass that information.

```js
<!-- specifying trigger parameters -->
<p data-elbaction="wait(10):interested"></p>
<p data-elbaction="pulse(10):interested"></p>
```

#### Action filter

At some point, you might want to nest an entity inside another. To prevent an action to trigger both entities you can restrict the action to a specific entity by adding the name, e.g. data-elbaction="load:view(product)".If the trigger event gets called, the result will only include the property values from the specific entities.

```js
<!-- setting a filter for an entity -->
<div data-elb="foo">
  <div data-elb="bar" data-elbaction="load:hello(bar)">
    only the bar hello event fires.
  </div>
</div>
```

#### Up-bubbling click trigger

By clicking an element the event is bubbling up to the body element. If the walker finds a data-elbaction with the click trigger it will fire the action. It's often the image or a whole div-block that gets clicked, not the parent a-element. Using the bubbling-up flow, the walker still triggers the actions for you.

```js
<button data-elb="product" data-elbaction="click">
  <img class="full" src="some.jpg" alt="" />
</button>
```

:::caution[Caution]
The click trigger uses the bubbling-up process. It will not work with stopPropagation or preventDefault.
:::