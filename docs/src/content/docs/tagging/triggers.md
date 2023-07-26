---
title: Triggers
---

Walker.js comes with a bunch of pre-built triggers.

You don't have to deal with event listener or mutation observer initialization anymore. Walker.js comes with a bunch of integrated triggers that will fire your event at the right moment.

| **Event**                                    | **Definition**                                                                                                                    |
|----------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------|
| load                                         | after loading a page when the DOM is ready                                                                                        |
| click                                        | when the element or a child is clicked                                                                                            |
| visible                                      | after the element has been in the viewport <br>for at least 50% for one second                                                    |
| hover                                        | each time the mouse enters the corresponding <br>element                                                                          |
| submit                                       | on a valid form submission                                                                                                        |
| wait(ms)                                     | waits ms seconds (15 seconds by default) <br>until triggering                                                                     |
| pulse(ms)                                    | recurring trigger every ms seconds (15 seconds <br>by default) if page is not hidden                                              |
| custom                                       | calling elbLayer.push(), see [using JavaScript](https://docs.elbwalker.com/tagging/using-javascript)                              |
| scroll(y)                                    | fires when min. y percent of the element's <br>height is above the bottom of the window,<br> e.g. scroll(80) for an 80% threshold |

:::caution[Caution]
Trigger names are predefined and need to be selected from the list while the `action` can be an arbitrarily defined name.
:::

#### Abbreviation

If the trigger and action values are equal, e.g. for click events, you can just shorten the implementation:

```html
<b data-elbaction="click">short</b> is equal to <s data-elbaction="click:click">long</s>
```

#### Parameters

Some triggers require more information during their initialization, others accept optional parameters. A scroll trigger needs to know about the percentage a user scrolls down while a wait trigger wants to know about the number of milliseconds until the action gets triggered. Use brackets behind the trigger to pass that information.

```html
<!-- specifying trigger parameters -->
<p data-elbaction="wait(10):interested"></p>
<p data-elbaction="pulse(10):interested"></p>
```

#### Action filter

At some point, you might want to nest an entity inside another. To prevent an action to trigger both entities you can restrict the action to a specific entity by adding the name, e.g. data-elbaction="load:view(product)".If the trigger event gets called, the result will only include the property values from the specific entities.

```html
<!-- setting a filter for an entity -->
<div data-elb="foo">
  <div data-elb="bar" data-elbaction="load:hello(bar)">
    only the bar hello event fires.
  </div>
</div>
```

#### Up-bubbling click trigger

By clicking an element the event is bubbling up to the body element. If the walker finds a data-elbaction with the click trigger it will fire the action. It's often the image or a whole div-block that gets clicked, not the parent a-element. Using the bubbling-up flow, the walker still triggers the actions for you.

```html
<button data-elb="product" data-elbaction="click">
  <img class="full" src="some.jpg" alt="" />
</button>
```

:::caution[Caution]
The click trigger uses the bubbling-up process. It will not work with stopPropagation or preventDefault.
:::