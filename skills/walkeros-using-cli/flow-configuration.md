# Flow.Config Configuration Reference

Complete reference for Flow.Config JSON configuration format.

---

## Structure Overview

```json
{
  "version": 3,
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

| Property  | Type                 | Description                               |
| --------- | -------------------- | ----------------------------------------- |
| `package` | `string`             | NPM package or local package name         |
| `config`  | `object`             | Destination-specific configuration        |
| `mapping` | `object`             | Event transformation rules                |
| `consent` | `object`             | Required consent levels                   |
| `before`  | `string \| string[]` | First transformer in post-collector chain |

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

| Property  | Type                 | Description                              |
| --------- | -------------------- | ---------------------------------------- |
| `package` | `string`             | Source package name                      |
| `config`  | `object`             | Source-specific configuration            |
| `next`    | `string \| string[]` | First transformer in pre-collector chain |

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

### Transformer Properties

| Property  | Type                 | Description                                |
| --------- | -------------------- | ------------------------------------------ |
| `package` | `string`             | Transformer package name                   |
| `config`  | `object`             | Transformer-specific configuration         |
| `code`    | `object`             | Inline code (`push`, `init`) with `$code:` |
| `next`    | `string \| string[]` | Next transformer in the chain              |

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
  "version": 3,
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
  "version": 3,
  "flows": {
    "ecommerce": {
      "web": {},
      "packages": {
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
