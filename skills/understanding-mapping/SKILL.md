---
name: understanding-mapping
description:
  Use when transforming events at any point in the flow (source→collector or
  collector→destination), configuring data/map/loop/condition, or understanding
  value extraction. Covers all mapping strategies.
---

# Understanding walkerOS Mapping

## Overview

Mapping transforms data at multiple points in the walkerOS flow:

1. **Source → Collector**: Transform raw input (HTTP requests, dataLayer pushes)
   into walkerOS events
2. **Collector → Destination**: Transform walkerOS events into vendor-specific
   formats

**Core principle:** Mapping is the universal transformation layer. Same
strategies work everywhere in the flow.

## Core Functions

See [packages/core/src/mapping.ts](../../packages/core/src/mapping.ts) for
implementation.

| Function                         | Purpose                                |
| -------------------------------- | -------------------------------------- |
| `getMappingEvent(event, rules)`  | Find mapping config for an event       |
| `getMappingValue(value, config)` | Transform a value using mapping config |

## Event Mapping

Match events to transformation rules by entity and action.

```typescript
const mapping = {
  // Exact match
  product: {
    view: { name: 'view_item' },
    add: { name: 'add_to_cart' },
  },

  // Wildcard: any action
  foo: {
    '*': { name: 'foo_interaction' },
  },

  // Wildcard: any entity
  '*': {
    bar: { name: 'generic_bar' },
  },
};
```

### Conditional Mapping

Array of conditions, first match wins:

```typescript
order: {
  complete: [
    {
      condition: (event) => event.data?.value > 100,
      name: 'high_value_purchase',
    },
    { name: 'purchase' }, // Fallback
  ],
}
```

## Value Mapping Strategies

### Key Extraction (string)

Extract nested property from event:

```typescript
'user.id'; // → event.user.id
'data.price'; // → event.data.price
'context.stage.0'; // → first element of stage array
```

### Static Value

Fixed value regardless of event:

```typescript
{
  value: 'USD';
}
{
  value: 99.99;
}
{
  value: true;
}
```

### Function Transform

Custom transformation logic:

```typescript
{
  fn: (event) => event.data.price * 100;
} // cents
{
  fn: (event) => event.user.email?.split('@')[1];
} // domain
```

### Object Map

Transform to new structure:

```typescript
{
  map: {
    item_id: 'data.id',
    item_name: 'data.name',
    price: 'data.price',
    currency: { value: 'USD' },
    category: { fn: (e) => e.nested?.[0]?.data?.name }
  }
}
```

### Array Loop

Process arrays (e.g., nested entities):

```typescript
{
  loop: [
    'nested', // Source array path
    {
      map: {
        item_id: 'data.id',
        quantity: 'data.quantity',
      },
    },
  ];
}
```

### Consent-Gated

Only return value if consent granted:

```typescript
{
  key: 'user.email',
  consent: { marketing: true }
}
```

## Complete Example

```typescript
const destinationConfig = {
  mapping: {
    product: {
      view: {
        name: 'view_item',
        data: {
          map: {
            currency: { value: 'USD' },
            value: 'data.price',
            items: {
              loop: [
                'nested',
                {
                  map: {
                    item_id: 'data.id',
                    item_name: 'data.name',
                  },
                },
              ],
            },
          },
        },
      },
    },
  },
};
```

## Example-Driven Development

When creating sources or destinations, define mapping examples BEFORE
implementation:

### 1. Create Input/Output Examples First

```typescript
// src/examples/inputs.ts - What we receive
export const pageViewInput = {
  event: 'page_view',
  properties: { page_title: 'Home', page_path: '/home' },
};

// src/examples/outputs.ts - What we must produce
export const pageViewOutput = {
  method: 'track',
  args: ['pageview', { url: '/home', title: 'Home' }],
};
```

### 2. Define Mapping to Connect Them

```typescript
// src/examples/mapping.ts
export const defaultMapping = {
  page: {
    view: {
      name: 'pageview',
      data: {
        map: {
          url: 'data.path',
          title: 'data.title',
        },
      },
    },
  },
};
```

### 3. Test Against Examples

```typescript
test('produces expected output', () => {
  const result = transform(examples.inputs.pageViewInput);
  expect(result).toMatchObject(examples.outputs.pageViewOutput);
});
```

**See:**

- [create-destination skill](../create-destination/SKILL.md) - Full workflow
- [create-source skill](../create-source/SKILL.md) - Full workflow

## Where Mapping Lives

| Location                       | Purpose                                   |
| ------------------------------ | ----------------------------------------- |
| Source config                  | Transform raw input → walkerOS events     |
| Destination config             | Transform walkerOS events → vendor format |
| `src/examples/mapping.ts`      | Default mapping examples (example-driven) |
| `packages/core/src/mapping.ts` | Core mapping functions                    |
| `apps/quickstart/src/`         | Validated examples                        |

## Related

**Skills:**

- [understanding-events skill](../understanding-events/SKILL.md) - Event
  structure to map from/to
- [understanding-sources skill](../understanding-sources/SKILL.md) - Source-side
  mapping
- [understanding-destinations skill](../understanding-destinations/SKILL.md) -
  Destination-side mapping

**Source Files:**

- [packages/core/src/mapping.ts](../../packages/core/src/mapping.ts) -
  Implementation

**Examples:**

- [apps/quickstart/src/](../../apps/quickstart/src/) - Validated examples

**Documentation:**

- [Website: Mapping](../../website/docs/mapping.mdx) - User-facing docs
- [walkeros.io/docs/destinations/event-mapping](https://www.walkeros.io/docs/destinations/event-mapping) -
  Public documentation
