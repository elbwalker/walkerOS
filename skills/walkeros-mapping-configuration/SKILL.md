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
| Transform value                | `{ fn: (e) => transform(e) }`                         |
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
        currency: { value: 'USD' },
        value: 'data.price',
        items: {
          loop: [
            'nested',
            {
              map: {
                item_id: 'data.id',
                item_name: 'data.name',
                item_category: 'data.category',
                price: 'data.price',
                quantity: { value: 1 },
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
        transaction_id: 'data.orderId',
        value: 'data.total',
        currency: 'data.currency',
        items: {
          loop: [
            'nested',
            {
              map: {
                item_id: 'data.id',
                item_name: 'data.name',
                price: 'data.price',
                quantity: 'data.quantity',
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
        content_ids: { fn: (e) => [e.data.id] },
        content_type: { value: 'product' },
        content_name: 'data.name',
        value: 'data.price',
        currency: { value: 'USD' },
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
        content_ids: { fn: (e) => e.nested?.map((n) => n.data.id) ?? [] },
        content_type: { value: 'product' },
        value: 'data.total',
        currency: 'data.currency',
        num_items: { fn: (e) => e.nested?.length ?? 0 },
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
    name: { fn: (e) => `${e.entity}_${e.action}` }, // page_view
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
      condition: (e) => (e.data?.total ?? 0) > 500,
      name: 'high_value_purchase',
      data: {
        map: {
          value: 'data.total',
          priority: { value: 'high' },
          notify: { value: true },
        },
      },
    },
    // Standard orders
    {
      name: 'purchase',
      data: { map: { value: 'data.total' } },
    },
  ],
}
```

### Patching Package-Shipped Rules (`extend` / `remove`)

Some packages (such as `@walkeros/transformer-ga4`) ship default mapping rules.
Normally a user rule at the same key replaces the default in full. Use `extend`
or `remove` to patch instead.

Two layers, two keywords:

- **`extend`** runs at init (config layer): deep-merges a partial rule onto the
  shipped default. A `null` value clears an inherited field.
- **`remove`** runs after evaluation (output layer): strips dotted paths from
  the final data payload. Applied last, always wins.

A rule with neither keyword keeps the existing replace behavior.

```json
{
  "purchase": {
    "extend": {
      "data": { "map": { "affiliation": "params.ep.affiliation" } }
    },
    "remove": ["currency"]
  }
}
```

This keeps all fields the package ships for `purchase`, adds `affiliation`, and
strips `currency` from the output.

For the full reference and the two-layer model, see
[Mapping.Rule docs](/docs/mapping/rule#patching-package-shipped-rules).

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
// Any product action
product: {
  '*': {
    name: { fn: (e) => `product_${e.action}` },
    data: 'data',
  },
}

// Any click on any entity
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

**Transform HTTP input to walkerOS event:**

```typescript
// In source config
{
  mapping: {
    // Map incoming field names to walkerOS structure
    name: { fn: (input) => `${input.entity} ${input.action}` },
    data: 'payload',
    user: {
      map: {
        id: 'userId',
        session: 'sessionId',
      },
    },
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
