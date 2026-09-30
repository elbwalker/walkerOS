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

The tested example
[flow-complete.json](../../packages/cli/examples/flow-complete.json) uses every
mapping feature on real destinations. Look them up by feature id in the manifest
(`flowCompleteFeatures` from `@walkeros/cli/examples`: JSON Pointer plus note)
instead of copying JSON; the guide
[flow-complete.md](../../packages/cli/examples/flow-complete.md) teaches them in
the chapters `mapping` and `consent-privacy`.

| Mapping feature                       | Feature ids                                                                    |
| ------------------------------------- | ------------------------------------------------------------------------------ |
| Rules per entity and action           | `destination-mapping`, `rule-name`, `rule-data`, `mapping-wildcard-ignore`     |
| Values                                | `value-key`, `value-map`, `value-loop`, `value-set`, `value-fn`, `value-value` |
| Conditions and fallbacks              | `value-condition`, `value-fallback`, `rule-condition`                          |
| Consent and policy                    | `rule-consent`, `value-consent`, `rule-policy`, `value-validate`               |
| Per-event settings, batching, include | `rule-settings`, `rule-batch`, `destination-include`                           |
| Patching a package default rule       | `rule-extend`, `rule-remove`                                                   |
| A whole rule: order complete to GA4   | `ga4-purchase`                                                                 |
