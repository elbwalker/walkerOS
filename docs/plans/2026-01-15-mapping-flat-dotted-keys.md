# Mapping: Support for Flat Keys with Dots

## Problem

The mapping system's `getByPath()` always splits keys by dots, making it
impossible to reference flat keys that contain dots in their names.

**Example:** When receiving GA4 Measurement Protocol requests:

```
GET /collect?en=add_to_cart&ep.item_id=123&epn.value=49.99
```

This parses to flat keys:

```json
{ "en": "add_to_cart", "ep.item_id": "123", "epn.value": 49.99 }
```

But mapping interprets dots as nested paths:

```typescript
map: {
  id: 'ep.item_id';
} // Looks for { ep: { item_id: ... } }, not "ep.item_id"
```

## Current Workaround

Use `fn` for direct property access:

```typescript
map: {
  id: {
    fn: (event) => event['ep.item_id'];
  }
}
```

This works but is verbose and breaks the declarative mapping pattern.

## Proposed Solution

Add escape syntax to `getByPath()` and `setByPath()`:

**Option A: Bracket notation**

```typescript
map: {
  id: "['ep.item_id']";
}
```

**Option B: Backslash escaping**

```typescript
map: {
  id: 'ep\\.item_id';
}
```

## Affected Files

- `/packages/core/src/byPath.ts` - `getByPath()` and `setByPath()`
- `/packages/core/src/__tests__/byPath.test.ts` - Add test cases

## Use Cases

- GA4 Measurement Protocol (`ep.xxx`, `epn.xxx`, `up.xxx`)
- Any webhook/API using dots in flat property names
