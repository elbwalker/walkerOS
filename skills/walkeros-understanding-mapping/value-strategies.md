# Value Mapping Strategies (Detailed Reference)

This file provides comprehensive examples for each value mapping strategy. For
quick reference, see the cheatsheet in [SKILL.md](SKILL.md#quick-reference).

---

## Key Extraction (string shorthand)

Extract nested property from event:

```typescript
'user.id'; // → event.user.id
'data.price'; // → event.data.price
'nested.0.data.id'; // → first nested entity's data.id
'context.stage.0'; // → first element of stage array
```

## Key with Fallback Value

Extract with static fallback if undefined:

```typescript
{ key: 'data.currency', value: 'EUR' }  // Use EUR if missing
{ key: 'data.sku', value: 'unknown' }   // Fallback to "unknown"
```

**JSON:**

```json
{ "key": "data.currency", "value": "EUR" }
```

## Static Value

Fixed value regardless of event:

```typescript
{
  value: 'EUR';
}
{
  value: 99.99;
}
{
  value: true;
}
{
  value: ['a', 'b'];
}
```

## Function Transform

Custom transformation logic:

```typescript
{ fn: (event) => event.data.price * 100 }           // Convert to cents
{ fn: (event) => event.user.email?.split('@')[1] }  // Extract domain
{ fn: (event, mapping, options) => /* ... */ }      // Full signature
```

**JSON with $code:**

```json
{ "fn": "$code:(event) => event.data.price * 100" }
{ "fn": "$code:() => Date.now()" }
```

## Object Map

Transform to new object structure:

```typescript
{
  map: {
    item_id: 'data.id',                              // Key extraction
    item_name: 'data.name',
    price: 'data.price',
    currency: { value: 'EUR' },                      // Static value
    category: { fn: (e) => e.nested?.[0]?.data?.name }, // Function
    discount: { key: 'data.discount', value: 0 },    // Key with fallback
  }
}
```

## Array Loop

Process arrays (e.g., nested entities):

```typescript
// Loop over nested entities
{
  loop: [
    'nested', // Source array path
    {
      map: {
        item_id: 'data.id',
        quantity: 'data.quantity',
      },
    },
  ],
}

// Loop with "this" - wrap single item as array
{
  loop: [
    'this', // Treat current event as single-item array
    {
      map: {
        item_id: 'data.id',
        item_name: 'data.name',
      },
    },
  ],
}
```

## Loop with Condition

Filter items during loop:

```typescript
{
  loop: [
    'nested',
    {
      condition: (entity) => entity.entity === 'product', // Only products
      map: {
        item_id: 'data.id',
        quantity: 'data.quantity',
      },
    },
  ],
}
```

**JSON with $code:**

```json
{
  "loop": [
    "nested",
    {
      "condition": "$code:(entity) => entity.entity === 'product'",
      "map": {
        "item_id": "data.id",
        "quantity": "data.quantity"
      }
    }
  ]
}
```

## Set (Create Array)

Create array from multiple values:

```typescript
// Single value in array
{
  set: ['data.id'];
} // → ["SKU-123"]

// Multiple values
{
  set: ['user.device', 'user.session'];
} // → ["d3v1c3", "s3ss10n"]

// Mixed extraction
{
  set: ['data.primary_id', { key: 'data.secondary_id', value: 'none' }];
}
```

**JSON:**

```json
{ "set": ["data.id"] }
{ "set": ["user.device", "user.session"] }
```

## Fallback Array

Try multiple extractions in order - first success wins:

```typescript
// Try sku first, fall back to id, then static value
[{ key: 'data.sku' }, { key: 'data.id' }, { value: 'unknown' }];
```

**JSON:**

```json
"item_id": [
  { "key": "data.sku" },
  { "key": "data.id" },
  { "value": "unknown" }
]
```

## Consent-Gated

Only return value if consent granted:

```typescript
{
  key: 'user.email',
  consent: { marketing: true }
}
```

Returns `undefined` (or fallback `value`) if consent not granted.

## Conditional Extraction

Only extract if condition passes:

```typescript
{
  condition: (event) => event.data?.type === 'premium',
  key: 'data.premium_id'
}
```

## Validate

Validate transformed value, return undefined if invalid:

```typescript
{
  key: 'data.email',
  validate: (value) => typeof value === 'string' && value.includes('@')
}
```

**JSON with $code:**

```json
{
  "key": "data.email",
  "validate": "$code:(value) => typeof value === 'string' && value.includes('@')"
}
```

---

## Function Signatures Reference

| Context             | Signature                                |
| ------------------- | ---------------------------------------- |
| `fn`                | `(value, mapping, options) => result`    |
| `condition` (value) | `(value, mapping, collector) => boolean` |
| `condition` (rule)  | `(event) => boolean`                     |
| `validate`          | `(value) => boolean`                     |
| `loop` condition    | `(item) => boolean`                      |
