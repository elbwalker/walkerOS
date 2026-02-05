# Complete Mapping Examples

Full destination configuration examples demonstrating multiple features
together.

---

## Destination Config (TypeScript)

```typescript
const destinationConfig = {
  consent: { marketing: true }, // Require consent for all events

  policy: {
    'meta.sent_at': { fn: () => Date.now() },
  },

  data: {
    map: {
      flow_version: { value: '1.0.0' },
    },
  },

  mapping: {
    product: {
      view: {
        name: 'view_item',
        data: {
          map: {
            currency: { key: 'data.currency', value: 'USD' },
            value: 'data.price',
            items: {
              loop: [
                'this',
                {
                  map: {
                    item_id: [{ key: 'data.sku' }, { key: 'data.id' }],
                    item_name: 'data.name',
                  },
                },
              ],
            },
          },
        },
      },
    },
    test: {
      '*': { ignore: true },
    },
  },
};
```

## Destination Config (JSON with $code:)

```json
{
  "consent": { "marketing": true },

  "policy": {
    "meta.sent_at": { "fn": "$code:() => Date.now()" }
  },

  "data": {
    "map": {
      "flow_version": { "value": "1.0.0" }
    }
  },

  "mapping": {
    "product": {
      "view": {
        "name": "view_item",
        "data": {
          "map": {
            "currency": { "key": "data.currency", "value": "USD" },
            "value": "data.price",
            "items": {
              "loop": [
                "this",
                {
                  "map": {
                    "item_id": [{ "key": "data.sku" }, { "key": "data.id" }],
                    "item_name": "data.name"
                  }
                }
              ]
            }
          }
        }
      }
    },
    "test": {
      "*": { "ignore": true }
    }
  }
}
```

---

## Live Reference

For the most comprehensive example covering 53+ features, see:

- [flow-complete.json](../../packages/cli/examples/flow-complete.json) -
  Comprehensive CLI example
- [flow-complete.md](../../packages/cli/examples/flow-complete.md) - Feature
  inventory
