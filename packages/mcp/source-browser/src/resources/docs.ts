import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

const HTML_ATTRIBUTES_DOCS = `# HTML Attributes

Tag your web components using \`data-elb\` attributes to enable structured event tracking without custom JavaScript.

By adding a few simple attributes to your markup, you can track user behavior such as clicks, views, form submissions, and more.

## Concept

\`\`\`html
<!-- Generic usage -->
<div
  data-elb="ENTITY"
  data-elb-ENTITY="KEY:VALUE"
  data-elbaction="TRIGGER:ACTION"   <!-- nearest entity only -->
  data-elbactions="TRIGGER:ACTION"  <!-- all entities -->
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
\`\`\`

## Entity and action

You define the entity **scope** by setting the \`data-elb\` attribute with the name of an entity to an element, e.g. \`data-elb="promotion"\`. The default entity is \`page\` when no \`data-elb\` is set.

An **action** can be added by setting one of the following attributes on the **same level** or **child elements** in combination with a **matching trigger**:

- **\`data-elbaction\`** - applies action to the **nearest entity only**
- **\`data-elbactions\`** - applies action to **all entities** in the DOM hierarchy

Both attributes use the same syntax, e.g., \`data-elbaction="visible:view"\` or \`data-elbactions="click:select"\` to fire events when triggered.

To define the entities' **properties**, set the **composited attribute** \`data-elb-ENTITY\` with the key and value, e.g. \`data-elb-promotion="name:tagging is fun;position:overlay"\`.

## Triggers

| **Trigger** | **Definition** |
|-------------|----------------|
| load | after loading a page when DOM is ready |
| click | when an element or a child is clicked |
| impression | after an element has been in the viewport for at least 50% for one second |
| visible | each time an element re-enters the viewport after being out of view |
| hover | each time the mouse enters the corresponding element |
| submit | on valid form submission |
| wait(ms) | waits ms seconds (15 seconds by default) until triggering |
| pulse(ms) | recurring trigger every ms seconds (15 seconds by default) if the page is not hidden |

> **Note:** Trigger names are predefined and to be selected from the list, while the action can be an arbitrarily defined name.

### Abbreviation

If the trigger and action values are equal, e.g. for click events, you can shorten the implementation:

\`\`\`html
<b data-elbaction="click">
  Use the short version, instead of
  <s data-elbaction="click:click">long</s>
</b>
\`\`\`

### Parameters

Some triggers accept optional parameters. Use brackets behind the trigger to pass that information.

\`\`\`html
<p data-elbaction="wait(10):interested"></p>
<p data-elbaction="pulse(10):interested"></p>
\`\`\`

### Action filter

To prevent an action from triggering unwanted entities, restrict the action to a specific entity by adding the name:

\`\`\`html
<div data-elb="foo">
  <div data-elb="bar" data-elbaction="load:hello(bar)">
    only the bar hello event fires.
  </div>
</div>
\`\`\`

## Linking elements

Use \`data-elblink\` to extend the scope of an entity by elements placed somewhere else (like modals). Specific IDs connect linked elements hierarchically as parent or child.

\`\`\`html
<div data-elb="info" data-elblink="details:parent">...</div>
...
<div data-elblink="details:child" data-elbaction="visible">...</div>
<p data-elblink="another:child">...</p>
\`\`\`

## Data

### Basic attributes

To specify data, use the name of the entity. Data attributes must be inside the entity scope or a parent.

\`\`\`html
<div data-elb-entity="source:parent">
  <div data-elb="entity">
    <p data-elb-entity="key:value">...</p>
    <p data-elb-entity="foo:bar">...</p>
  </div>
</div>
\`\`\`

### Type casting

Property values will be cast to their type, supporting string, number & boolean.

\`\`\`html
<div data-elb="types">
  <p data-elb-types="string:text">{ string: "text" }</p>
  <p data-elb-types="int:42;float:3.14">{ int: 42, float: 3.14 }</p>
  <p data-elb-types="bool:true">{ bool: true }</p>
</div>
\`\`\`

### Multiple attributes

Use semicolons to separate key-value pairs. Use single quotes to escape values that contain semicolons.

\`\`\`html
<p data-elb="foo" data-elb-foo="b:a;r">{ "b": "a", "r": true }</p>
<p data-elb="foo" data-elb-foo="b:'a;r'">{ "b": "a;r" }</p>
\`\`\`

### Dynamic field values

Use \`#\` at the beginning followed by the attribute name to access the value of the element attribute.

\`\`\`html
<input type="text" value="blue" data-elb-product="color:#value" />
<div data-elb-product="name:#innerHTML">Everyday Ruck Snack</div>
\`\`\`

### Arrays

Add the \`[]\` suffix to a property's name, such as \`size[]:m\`. It will generate de-duplicated data properties.

\`\`\`html
<div data-elb="product">
  <p data-elb-product="size[]:s;size[]:l"></p>
  <p data-elb-product="size[]:l"></p>
</div>
\`\`\`

### Generic properties

Leave the entity name empty (only \`data-elb-\`) to add the property to any related entity. Explicitly named properties are preferred over generic ones.

## Globals

Properties that apply to **all events on a page**. Define them anywhere using the \`data-elbglobals\` attribute. Globals are collected once, right before the first event.

\`\`\`html
<div data-elbglobals="outof:scope"></div>
<div data-elb="entity" data-elb-entity="foo:bar" data-elbaction="load:action" />
\`\`\`

## Context

Context provides framing information for events (position, test, component). Use \`data-elbcontext\` on ancestor elements.

\`\`\`html
<div data-elbcontext="test:engagement" data-elbglobals="plan:paid">
  <div data-elbcontext="recommendation:smart_ai">
    <div data-elb="promotion" data-elbaction="click" data-elb-promotion="title:click me">
      click me
    </div>
  </div>
</div>
\`\`\`

Context properties are tuples with the value and an index, starting at the closest parent (\`[value, index]\`).

## Nested entities

A \`data-elb\` entity within another \`data-elb\` entity is called a nested entity. Nested entities are accessible in the \`nested\` array of each event.

\`\`\`html
<div data-elb="mother" data-elb-mother="label:caring" data-elbaction="load:view">
  <div data-elb="son" data-elb-son="age:23"></div>
  <div data-elb="daughter" data-elb-daughter="age:32">
    <div data-elb="baby" data-elb-baby="status:infant"></div>
  </div>
</div>
\`\`\`

## Reserved attributes

\`data-elb\`, \`data-elbaction\`, \`data-elbactions\`, \`data-elbcontext\`, \`data-elbglobals\`, and \`data-elblink\` are reserved attributes. \`data-elb-*\` attributes may be arbitrary combinations based on the related entity name.
`;

const TAGGER_DOCS = `# Tagger

The tagger is a utility for generating HTML data attributes that the walkerOS browser source uses for event tracking. It provides a fluent interface to create properly formatted and escaped data attributes for your HTML elements.

Package: \`@walkeros/web-source-browser\`

## Why use the tagger?

- **Consistent formatting** - Ensures data attributes follow walkerOS conventions
- **Automatic escaping** - Handles special characters in values (semicolons, colons, quotes, backslashes)
- **Type safety** - Provides TypeScript support for better development experience
- **Fluent API** - Chainable methods for building complex attribute sets
- **Maintainability** - Centralized logic for attribute generation

## Installation

\`\`\`bash
npm install @walkeros/web-source-browser
\`\`\`

## Initialization

\`\`\`typescript
import { createTagger } from '@walkeros/web-source-browser';

// Create with default configuration
const tagger = createTagger();

// Create with custom configuration
const customTagger = createTagger({
  prefix: 'data-elb',
});
\`\`\`

## Usage examples

### Basic data tagging (without entity)

\`\`\`typescript
const tagger = createTagger();

// Using tagger with a scope parameter sets naming for data attributes only
const attributes = tagger('product')
  .data('id', '123')
  .data('name', 'Widget')
  .get();

// Result:
// {
//   'data-elb-product': 'id:123;name:Widget'
// }
// Note: No 'data-elb' entity attribute is created
\`\`\`

### Entity tagging

\`\`\`typescript
// To create an entity attribute, use the .entity() method
const attributes = tagger()
  .entity('product')
  .data('id', '123')
  .data('name', 'Widget')
  .get();

// Result:
// {
//   'data-elb': 'product',
//   'data-elb-product': 'id:123;name:Widget'
// }
\`\`\`

### Action mapping

\`\`\`typescript
const attributes = tagger()
  .action('load', 'view')
  .action('click', 'select')
  .get();

// Result:
// {
//   'data-elbaction': 'load:view;click:select'
// }
\`\`\`

### Context and global properties

\`\`\`typescript
const attributes = tagger('product')
  .data('id', 123)
  .context('test', 'engagement')
  .globals('lang', 'en')
  .get();

// Result:
// {
//   'data-elb': 'product',
//   'data-elb-product': 'id:123',
//   'data-elbcontext': 'test:engagement',
//   'data-elbglobals': 'lang:en'
// }
\`\`\`

## Available methods (API reference)

##### \`tagger(scope?: string)\`

Creates a new tagger instance. The optional scope parameter sets the naming scope for data attributes without creating an entity attribute.

\`\`\`typescript
// Without scope - generic data attributes
tagger().data('key', 'value');
// Creates: data-elb-="key:value"

// With scope - scoped data attributes (no entity attribute)
tagger('product').data('id', '123');
// Creates: data-elb-product="id:123"
\`\`\`

##### \`.entity(name: string)\`

Sets the entity attribute and updates the naming scope for subsequent data calls.

\`\`\`typescript
tagger().entity('product').data('id', '123');
// Creates: data-elb="product" data-elb-product="id:123"

// Entity changes the naming scope
tagger('foo').entity('bar').data('a', 1);
// Creates: data-elb="bar" data-elb-bar="a:1"
\`\`\`

##### \`.data(key: string, value: Property)\` | \`.data(object: Properties)\`

Adds data properties using the current naming scope.

\`\`\`typescript
// Single property
tagger('product').data('id', 123);
// Creates: data-elb-product="id:123"

// Multiple properties
tagger('product').data({ id: 123, name: 'Widget', price: 99.99 });
// Creates: data-elb-product="id:123;name:Widget;price:99.99"
\`\`\`

##### \`.action(trigger: string, action?: string)\` | \`.action(object: Record<string, string>)\`

Adds action mappings for event triggers. Creates a \`data-elbaction\` attribute.

\`\`\`typescript
tagger().action('load', 'view');
tagger().action({ load: 'view', click: 'select', impression: 'view' });
\`\`\`

##### \`.actions(trigger: string, action?: string)\` | \`.actions(object: Record<string, string>)\`

Adds action mappings for event triggers. Creates a \`data-elbactions\` attribute.

\`\`\`typescript
tagger().actions('load', 'view');
tagger().actions({ load: 'view', click: 'select', visible: 'visible' });

// Can be combined with action() method
tagger().action('click', 'select').actions('load', 'view');
\`\`\`

##### \`.context(key: string, value: Property)\` | \`.context(object: Properties)\`

Adds context properties.

\`\`\`typescript
tagger().context('test', 'engagement');
tagger().context({ test: 'engagement', position: 'header', type: 'promo' });
\`\`\`

##### \`.globals(key: string, value: Property)\` | \`.globals(object: Properties)\`

Adds global properties.

\`\`\`typescript
tagger().globals('lang', 'en');
tagger().globals({ lang: 'en', plan: 'paid', version: '1.0' });
\`\`\`

##### \`.link(id: string, type: string)\` | \`.link(object: Record<string, string>)\`

Adds link relationships between elements.

\`\`\`typescript
tagger().link('details', 'parent');
tagger().link({ details: 'parent', modal: 'child', sidebar: 'child' });
\`\`\`

##### \`.get()\`

Generates the final HTML attributes object.

\`\`\`typescript
// With naming scope only
const attributes = tagger('product').data('id', '123').get();
// Returns: { 'data-elb-product': 'id:123' }

// With entity attribute
const attributes = tagger().entity('product').data('id', '123').get();
// Returns: { 'data-elb': 'product', 'data-elb-product': 'id:123' }
\`\`\`

All methods return the tagger instance for method chaining, except \`get()\` which returns the final attributes object.

## Common use cases

### Product listing page

\`\`\`typescript
function ProductCard({ product }) {
  return (
    <div
      {...tagger('product')
        .data({
          id: product.id,
          name: product.name,
          price: product.price,
          category: product.category
        })
        .action('click', 'select')
        .get()}
    >
      {product.name}
    </div>
  );
}
\`\`\`

### Shopping cart

\`\`\`typescript
function CartItem({ item }) {
  return (
    <div
      {...tagger()
        .entity('cart')
        .data({
          productId: item.id,
          quantity: item.quantity,
          price: item.price
        })
        .action('click', 'remove')
        .get()}
    >
      {item.name}
    </div>
  );
}
\`\`\`
`;

export function registerDocResources(server: McpServer) {
  server.resource(
    'tagging-html-attributes',
    'walkeros://docs/tagging/html-attributes',
    {
      title: 'walkerOS HTML Attributes Tagging Reference',
      description: 'Complete guide to data-elb HTML attribute tagging',
      mimeType: 'text/markdown',
    },
    async () => ({
      contents: [
        {
          uri: 'walkeros://docs/tagging/html-attributes',
          mimeType: 'text/markdown' as const,
          text: HTML_ATTRIBUTES_DOCS,
        },
      ],
    }),
  );

  server.resource(
    'tagging-tagger-api',
    'walkeros://docs/tagging/tagger',
    {
      title: 'walkerOS Tagger API Reference',
      description:
        'createTagger() fluent API for generating data-elb attributes',
      mimeType: 'text/markdown',
    },
    async () => ({
      contents: [
        {
          uri: 'walkeros://docs/tagging/tagger',
          mimeType: 'text/markdown' as const,
          text: TAGGER_DOCS,
        },
      ],
    }),
  );
}
