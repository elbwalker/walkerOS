# Flow.Setup Configuration Reference

Complete reference for Flow.Setup JSON configuration format.

---

## Structure Overview

```json
{
  "version": 1,
  "flows": {
    "<flowName>": {
      "web": {} | "server": {},
      "packages": {},
      "sources": {},
      "destinations": {},
      "transformers": {},
      "mappings": {},
      "collector": {}
    }
  }
}
```

---

## Platform Selection

Every flow must specify exactly one platform:

```json
{
  "flows": {
    "myFlow": {
      "web": {}, // Browser environment
      "packages": {}
    }
  }
}
```

Or:

```json
{
  "flows": {
    "myFlow": {
      "server": {}, // Node.js environment
      "packages": {}
    }
  }
}
```

---

## Packages

### NPM Packages

```json
{
  "packages": {
    "@walkeros/web-destination-gtag": {},
    "@walkeros/destination-demo": {}
  }
}
```

### With Specific Imports

```json
{
  "packages": {
    "@walkeros/collector": {
      "imports": ["startFlow", "stopFlow"]
    }
  }
}
```

### Local Packages

```json
{
  "packages": {
    "my-custom-destination": {
      "path": "./local/my-destination"
    },
    "another-package": {
      "path": "/absolute/path/to/package"
    }
  }
}
```

---

## Destinations

```json
{
  "destinations": {
    "gtag": {
      "package": "@walkeros/web-destination-gtag",
      "config": {
        "measurementId": "G-XXXXXX"
      },
      "mapping": {
        "product": {
          "view": { "name": "view_item" }
        }
      }
    }
  }
}
```

### Destination Properties

| Property  | Description                        |
| --------- | ---------------------------------- |
| `package` | NPM package or local package name  |
| `config`  | Destination-specific configuration |
| `mapping` | Event transformation rules         |
| `consent` | Required consent levels            |

For mapping syntax, see
[walkeros-understanding-mapping](../walkeros-understanding-mapping/SKILL.md).

---

## Sources

```json
{
  "sources": {
    "web": {
      "package": "@walkeros/web-source",
      "config": {
        "dataLayer": true,
        "globalsStatic": true
      }
    }
  }
}
```

### Source Properties

| Property  | Description                   |
| --------- | ----------------------------- |
| `package` | Source package name           |
| `config`  | Source-specific configuration |

---

## Transformers

```json
{
  "transformers": {
    "validate": {
      "package": "@walkeros/transformer-validate",
      "config": {},
      "next": "enrich"
    },
    "enrich": {
      "package": "@walkeros/transformer-enrich",
      "config": {}
    }
  }
}
```

### Transformer Chaining

Use `next` to chain transformers:

```
validate → enrich → [destinations]
```

---

## Collector Configuration

```json
{
  "collector": {
    "consent": { "functional": true },
    "globals": { "version": "1.0" }
  }
}
```

---

## Inline Code ($code: Prefix)

Embed JavaScript in JSON for mappings:

```json
{
  "mapping": {
    "product": {
      "view": {
        "name": "view_item",
        "data": {
          "map": {
            "value": "$code:(event) => event.data.price * 100",
            "currency": { "value": "USD" }
          }
        }
      }
    }
  }
}
```

### Supported Contexts

| Property    | Signature                             |
| ----------- | ------------------------------------- |
| `fn`        | `(value, mapping, options) => result` |
| `condition` | `(event) => boolean`                  |
| `validate`  | `(value) => boolean`                  |

---

## Multi-Flow Configs

```json
{
  "version": 1,
  "flows": {
    "analytics": {
      "web": {},
      "packages": { "@walkeros/web-destination-gtag": {} },
      "destinations": {
        /* ... */
      }
    },
    "marketing": {
      "web": {},
      "packages": { "@walkeros/web-destination-meta": {} },
      "destinations": {
        /* ... */
      }
    },
    "server": {
      "server": {},
      "packages": { "@walkeros/destination-api": {} },
      "destinations": {
        /* ... */
      }
    }
  }
}
```

### Building Multi-Flow

```bash
# Build specific flow
walkeros bundle config.json --flow analytics

# Build all flows
walkeros bundle config.json --all
```

---

## Complete Example

```json
{
  "version": 1,
  "flows": {
    "ecommerce": {
      "web": {},
      "packages": {
        "@walkeros/collector": { "imports": ["startFlow"] },
        "@walkeros/web-source": {},
        "@walkeros/web-destination-gtag": {}
      },
      "sources": {
        "web": {
          "package": "@walkeros/web-source",
          "config": { "dataLayer": true }
        }
      },
      "destinations": {
        "ga4": {
          "package": "@walkeros/web-destination-gtag",
          "config": { "measurementId": "G-XXXXXX" },
          "mapping": {
            "product": {
              "view": {
                "name": "view_item",
                "data": {
                  "map": {
                    "currency": { "value": "USD" },
                    "value": "data.price",
                    "items": {
                      "loop": [
                        "this",
                        {
                          "map": {
                            "item_id": "data.id",
                            "item_name": "data.name"
                          }
                        }
                      ]
                    }
                  }
                }
              }
            },
            "order": {
              "complete": {
                "name": "purchase",
                "data": {
                  "map": {
                    "transaction_id": "data.orderId",
                    "value": "data.total"
                  }
                }
              }
            }
          }
        }
      },
      "collector": {
        "consent": { "functional": true }
      }
    }
  }
}
```

---

## Reference

- [packages/cli/examples/](../../packages/cli/examples/) - Example configs
- [packages/cli/README.md](../../packages/cli/README.md) - Full CLI docs
- [flow-complete.json](../../packages/cli/examples/flow-complete.json) -
  Comprehensive example
