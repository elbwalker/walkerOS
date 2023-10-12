---
title: Properties
---

## Basic attributes

Use the name of the entity to specify its properties. Property attributes have to be inside of the entity-scope

```html
<div data-elb="entity">
  <p data-elb-entity="key:value" />
  <p data-elb-entity="foo:bar" />
</div>
```

### Type casting

Property values will be casted to their type, supporting string, number & boolean.

```html
<div data-elb="types">
  <p data-elb-types="string:text">{ string: "text" }</p>
  <p data-elb-types="int:42;float:3.14">{ int: 42, float: 3.14 }</p>
  <p data-elb-types="bool:true">{ bool: true }</p>
</div>
```

## Multiple attributes

Browsers override duplicate attributes. Hence an element can only have one `data-elb`, `data-elb-ENTITY`, and/or data-elbaction attribute at a time. Nevertheless, it’s possible to define multiple entities, properties, and/or actions all at once within one attribute using quotes and semicolons. 
Key-value pairs are split by a semicolon. Therefore it’s necessary to escape values containing a semicolon. Quotes are here to meet your needs. To prevent a mistaken value-split use single quotes.

```html
<!-- value wrapping with quotes -->
<p data-elb="foo" data-elb-foo="b:a;r">{ "b": "a", "r": true }</p>
<p data-elb="foo" data-elb-foo="b:'a;r'">{ "b": "a;r" }</p>
```

If a single quote is part of the value escape it with a backslash:

```html
<!-- escaping values with backslash -->
<p data-elb="foo" data-elb-foo="bar:it\'s escaped">{ "bar": "it's escaped" }</p>
```

The semicolon can be used as a separator to list multiple values inside of a `data-elb` or `data-elbaction` attribute.

```html
<!-- using multiple key-value pairs at once -->
<p data-elb="foo" data-elb-foo="a:1;b:2">{ "a": 1, "b": 2 }</p>
```

## Dynamic field values

You might want to measure dynamic field values e.g. the quantity of a product or the value of the selected element. Use a `#` at the beginning followed by the attributes name to get access to the value of the element attribute.

```html
<!-- Basic usage: elb-ENTITY="KEY:#VALUE" -->
<input type="text" value="blue" data-elb-product="color:#value"></input>
<div data-elb-product="name:#innerHTML">Everyday Ruck Snack</div>
```

To capture a selected option from a list use `elb-ENTITY="KEY:#selected"` to get size:20L

```html
<select data-elb-product="size:#selected">
  <option value="18L">18L</option>
  <option value="20L" selected="selected">20L</option>
</select>
```

## Arrays

To use array types add the `[]` suffix to a properties name, like `size[]:m`. The walker.js will generate de-duplicated data properties.

```html
<div data-elb="product">
  <p data-elb-product="size[]:s;size[]:l"></p>
  <p data-elb-product="size[]:l"></p>
</div>
```

```js
{
  data: {
    size: ["s", "l"],
  },
  // ...
}
```

## Generic properties

Leave the entity name empty (`data-elb-`) to add the property to any related entity. Explicitly named properties are preferred over generic ones. It's suggested to <b> HIER FEHLT TEXT!!!!</b>

```html
<div data-elb-="p:v">
  <div data-elb="generic">
    <p data-elb-generic="k:v"></p>
    <p data-elb-="g:v"></p>
    <p data-elb-generic="o:v"></p>
    <p data-elb-="o:x"></p>
  </div>
</div>
```
```js
{
  data: {
    p: 'v', // parent
    k: 'v', // explicit
    g: 'v', // generic
    o: 'v' // overridden by explicit
  },
  // ...
}
```
