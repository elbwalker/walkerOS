---
title: Debugging
---

##### Some handy ideas on how to debug easily

### elbLayer

Usually, events get pushed to the `window.elbLayer`. You can take a look at the elbLayer in the console to see events. However, some events might skip the elbLayer.

### Console destination

Add a custom destination where push points to console.log to list all events in the console:

```js
import { elb } from '@elbwalker/client-web';
elb('walker destination', {
  push: console.log,
});
```

### Test the tagging

Use selectors to loop through all elb-tags on a page and display the results in the console:

```js
// Loop all entities
queryScope(document.body, "[data-elb]", function (entity) {
  console.log(`------`);
  const entityName = entity.getAttribute("data-elb");

  // Loop all acctions
  queryScope(entity, "[data-elbaction]", function (action) {
    const actionName = action.getAttribute("data-elbaction");
    console.log("event", entityName, actionName);
  });

  // Get all properties
  const properties = [];
  const propertyAttr = `data-elb-${entityName}`;
  queryScope(entity, `[${propertyAttr}]`, function (prop) {
    properties.push(prop.getAttribute(propertyAttr));
  });
  console.log("properties", properties);
});

function queryScope(scope, selector, func) {
  [scope, ...scope.querySelectorAll(selector)]
    .filter((el) => el.matches(selector))
    .map((elem) => {
      func.call(scope, elem);
    });
}
```