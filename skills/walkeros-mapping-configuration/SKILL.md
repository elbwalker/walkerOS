---
name: walkeros-mapping-configuration
description:
  Use when configuring walkerOS event mappings for specific use cases. Provides
  recipes for GA4, Meta, custom APIs, and common transformation patterns.
---

# Mapping Configuration Recipes

## Prerequisites

Read [understanding-mapping](../walkeros-understanding-mapping/SKILL.md) first
for core concepts.

## Quick Reference

| I want to...                   | Use this pattern                                      |
| ------------------------------ | ----------------------------------------------------- |
| Rename event                   | `{ name: 'new_name' }`                                |
| Extract nested value           | `'data.nested.value'`                                 |
| Set static value               | `{ value: 'USD' }`                                    |
| Transform value                | `{ fn: (value, { event }) => transform(event) }`      |
| Build object                   | `{ map: { key: 'source' } }`                          |
| Process array                  | `{ loop: ['source', { map: {...} }] }`                |
| Gate by consent                | `{ key: 'data.email', consent: { marketing: true } }` |
| First defined value (fallback) | `[{ key: 'data.sku' }, { key: 'data.id' }]`           |
| Add a field to a default rule  | `{ extend: { data: { map: { x: 'path' } } } }`        |
| Drop a field from output       | `{ remove: ['field.path'] }`                          |

## Common Recipes

### GA4 / gtag

**Product view → view_item:**

```typescript
product: {
  view: {
    name: 'view_item',
    data: {
      map: {
        currency: { key: 'data.currency', value: 'EUR' },
        value: 'data.price',
        items: {
          loop: [
            'this', // the product is the event itself
            {
              map: {
                item_id: 'data.id',
                item_name: 'data.name',
                item_category: 'data.category',
                price: 'data.price',
                quantity: { key: 'data.quantity', value: 1 },
              },
            },
          ],
        },
      },
    },
  },
}
```

**Order complete → purchase:**

```typescript
order: {
  complete: {
    name: 'purchase',
    data: {
      map: {
        transaction_id: 'data.id',
        value: 'data.value',
        currency: { key: 'data.currency', value: 'EUR' },
        items: {
          loop: [
            'nested',
            {
              // only the products, not other nested entities
              condition: (entity) =>
                typeof entity === 'object' &&
                entity !== null &&
                'entity' in entity &&
                entity.entity === 'product',
              map: {
                item_id: 'data.id',
                item_name: 'data.name',
                price: 'data.price',
                quantity: { key: 'data.quantity', value: 1 },
              },
            },
          ],
        },
      },
    },
  },
}
```

### Meta Pixel

**Product view → ViewContent:**

```typescript
product: {
  view: {
    name: 'ViewContent',
    data: {
      map: {
        content_ids: { set: ['data.id'] },
        content_type: { value: 'product' },
        content_name: 'data.name',
        value: 'data.price',
        currency: { key: 'data.currency', value: 'EUR' },
      },
    },
  },
}
```

**Order complete → Purchase:**

```typescript
order: {
  complete: {
    name: 'Purchase',
    data: {
      map: {
        content_ids: {
          loop: [
            'nested',
            {
              condition: (entity) =>
                typeof entity === 'object' &&
                entity !== null &&
                'entity' in entity &&
                entity.entity === 'product',
              key: 'data.id',
            },
          ],
        },
        content_type: { value: 'product' },
        value: 'data.value',
        currency: { key: 'data.currency', value: 'EUR' },
        num_items: {
          fn: (value, { event }) =>
            event.nested?.filter((entity) => entity?.entity === 'product')
              .length ?? 0,
        },
      },
    },
  },
}
```

### Custom API Destination

**Transform to REST API format:**

```typescript
'*': {
  '*': {
    // A computed name goes in policy: a rule's name is a fixed string
    policy: {
      name: { fn: (value, { event }) => `${event.entity}_${event.action}` }, // page_view
    },
    data: {
      map: {
        eventName: 'name',
        eventData: 'data',
        userId: 'user.id',
        sessionId: 'user.session',
        timestamp: 'timestamp',
        metadata: {
          map: {
            consent: 'consent',
            globals: 'globals',
          },
        },
      },
    },
  },
}
```

### Conditional Mapping

**Different mapping based on event data:**

```typescript
order: {
  complete: [
    // High-value orders get extra tracking
    {
      condition: (value, { event }) =>
        typeof event.data?.value === 'number' && event.data.value > 500,
      name: 'high_value_purchase',
      data: {
        map: {
          value: 'data.value',
          priority: { value: 'high' },
          notify: { value: true },
        },
      },
    },
    // Standard orders
    {
      name: 'purchase',
      data: { map: { value: 'data.value' } },
    },
  ],
}
```

### Patching Package-Shipped Rules (`extend` / `remove`)

`@walkeros/transformer-ga4` ships default mapping rules in its
`settings.mapping`. Normally a user rule at the same key replaces the default in
full. Use `extend` or `remove` to patch instead.

Two layers, two keywords:

- **`extend`** runs at init (config layer): deep-merges a partial rule onto the
  shipped default. A `null` value clears an inherited field. Only a package that
  ships defaults merges it; on any other rule `walkeros validate` and the bundle
  reject it (`MAPPING_NO_OP`).
- **`remove`** runs after evaluation (output layer): strips dotted paths from
  the final data payload. Applied last, always wins. It also works in a
  destination's own rules.

A rule with neither keyword replaces the default in full.

```json
{
  "settings": {
    "mapping": {
      "purchase": {
        "extend": {
          "data": { "map": { "affiliation": "params.ep.affiliation" } }
        },
        "remove": ["currency"]
      }
    }
  }
}
```

This keeps all fields the transformer ships for `purchase`, adds `affiliation`,
and strips `currency` from the output.

For the full reference and the two-layer model, see
[Mapping.Rule docs](https://www.walkeros.io/docs/mapping/rule#patching-package-shipped-rules).

### Value[] Fallback Chains

At any value position, an array of values is a fallback chain: the first entry
that resolves to a defined value wins.

```json
{
  "item_id": [
    { "key": "data.sku" },
    { "key": "data.id" },
    { "value": "unknown" }
  ]
}
```

Use this to try multiple source fields before falling back to a constant.

### Consent-Gated Fields

**Only include PII if consent granted:**

```typescript
user: {
  login: {
    name: 'login',
    data: {
      map: {
        method: 'data.method',
        // Only include email if marketing consent
        email: {
          key: 'user.email',
          consent: { marketing: true },
        },
        // Only include user ID if functional consent
        userId: {
          key: 'user.id',
          consent: { functional: true },
        },
      },
    },
  },
}
```

### Wildcard Patterns

**Catch-all for unmatched events:**

```typescript
// Any product action (a computed name goes in policy)
product: {
  '*': {
    policy: { name: { fn: (value, { event }) => `product_${event.action}` } },
    data: 'data',
  },
}

// A click on any entity without its own rule for it: with the product rule
// above, a product click matches product '*' instead
'*': {
  click: {
    name: 'element_click',
    data: {
      map: {
        element_type: 'entity',
        element_id: 'data.id',
      },
    },
  },
}
```

## Source-Side Mapping

A source's `mapping` uses the same entity-action rules on the events the source
pushes, before they reach the collector, for example to rename, edit (`policy`)
or drop them. Turning a raw request format into events is the source's own job
(see [create-source](../walkeros-create-source/SKILL.md)).

```typescript
// In a source's config
{
  mapping: {
    product: { click: { name: 'product view' } }, // rename
    test: { '*': { ignore: true } }, // drop every test event
  },
}
```

## Debugging Tips

1. **Event not mapping?** Check entity/action match exactly (case-sensitive)
2. **Data missing?** Verify source path exists: `'data.nested.field'`
3. **Function errors?** Add null checks: `e.data?.price ?? 0`
4. **Array empty?** Confirm `nested` array exists and has items

## Related Skills

- [walkeros-understanding-mapping](../walkeros-understanding-mapping/SKILL.md) -
  Core mapping concepts

**Reference:**

- [packages/core/src/mapping.ts](../../packages/core/src/mapping.ts) -
  Implementation
- [apps/quickstart/src/](../../apps/quickstart/src/) - Validated examples
