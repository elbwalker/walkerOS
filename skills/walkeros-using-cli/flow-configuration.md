# Flow.Json Configuration Reference

Complete reference for Flow.Json JSON configuration format.

---

## Structure Overview

```json
{
  "version": 4,
  "flows": {
    "<flowName>": {
      "config": {
        "platform": "web" | "server",
        "settings": {},
        "bundle": {
          "packages": {},
          "overrides": {},
          "traceInclude": []
        }
      },
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

Every flow must specify exactly one platform via `config.platform`:

```json
{
  "flows": {
    "myFlow": {
      "config": {
        "platform": "web"
      }
    }
  }
}
```

Or:

```json
{
  "flows": {
    "myFlow": {
      "config": {
        "platform": "server"
      }
    }
  }
}
```

Platform-specific options live under `config.settings` (for example, server
runtime options or web bootstrap behavior).

---

## Packages

Bundle-time packages live under `flow.<name>.config.bundle.packages`. Pacote
installs them transparently. **You do NOT run `npm install` for step packages;
flow.json is the single source of truth.**

### NPM Packages

```json
{
  "config": {
    "platform": "web",
    "bundle": {
      "packages": {
        "@walkeros/web-destination-gtag": {},
        "@walkeros/destination-demo": {}
      }
    }
  }
}
```

### With Specific Imports

```json
{
  "config": {
    "platform": "web",
    "bundle": {
      "packages": {
        "@walkeros/collector": {
          "imports": ["startFlow", "stopFlow"]
        }
      }
    }
  }
}
```

### Local Packages

```json
{
  "config": {
    "platform": "web",
    "bundle": {
      "packages": {
        "my-custom-destination": {
          "path": "./local/my-destination"
        },
        "another-package": {
          "path": "/absolute/path/to/package"
        }
      }
    }
  }
}
```

### Overrides

`flow.<name>.config.bundle.overrides` pins transitive dependency versions
(npm-style):

```json
{
  "config": {
    "platform": "web",
    "bundle": {
      "packages": { "@walkeros/web-destination-amplitude": {} },
      "overrides": {
        "@amplitude/analytics-types": "2.11.1"
      }
    }
  }
}
```

### traceInclude (server flows only)

Server flows are bundled with `@vercel/nft`. nft statically discovers files
reachable from the entry. For the rare case it cannot reach a runtime asset
(typically `require()` of a path constructed from a runtime variable), declare
the file explicitly under `flow.<name>.config.bundle.traceInclude`. Paths and
globs both work, resolved against the install root (where pacote put files):

```json
{
  "config": {
    "platform": "server",
    "bundle": {
      "packages": { "@walkeros/server-destination-gcp": {} },
      "traceInclude": [
        "node_modules/some-pkg/data/*.json",
        "node_modules/another-pkg/lib/runtime-loaded.js"
      ]
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

| Property  | Type                               | Description                                                        |
| --------- | ---------------------------------- | ------------------------------------------------------------------ |
| `package` | `string`                           | NPM package or local package name                                  |
| `config`  | `object`                           | Destination-specific configuration                                 |
| `mapping` | `object`                           | Event transformation rules                                         |
| `consent` | `object`                           | Required consent levels                                            |
| `before`  | `string \| Route[] \| RouteConfig` | First transformer in post-collector chain (conditional via `case`) |

**Route shape** (used wherever the type column shows `Route[]` or
`RouteConfig`). A `RouteConfig` is a **disjoint union** — set at most one of
`next` (gated link) or `case` (first-match dispatch), never both:

```json
// Sequence form (chained, no dispatch):
"before": ["validate", "enrich"]

// Gated link:
"before": {
  "match": { "key": "ingest.path", "operator": "prefix", "value": "/api" },
  "next": "api-handler"
}

// First-match dispatch (case):
"before": {
  "case": [
    { "match": { "key": "ingest.method", "operator": "eq", "value": "POST" }, "next": "post-chain" },
    { "next": "default" }
  ]
}
```

`case` entries evaluate in order, first match wins. An entry with no `match`
always matches (use it as a fallback). The match object reads from ingest
metadata (e.g. `ingest.path`, `ingest.method`). No matching entry means the
event passes through unchanged.

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

| Property  | Type                               | Description                                                       |
| --------- | ---------------------------------- | ----------------------------------------------------------------- |
| `package` | `string`                           | Source package name                                               |
| `config`  | `object`                           | Source-specific configuration                                     |
| `next`    | `string \| Route[] \| RouteConfig` | First transformer in pre-collector chain (conditional via `case`) |

`Route` shape: see [Destination Properties](#destination-properties) above.

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

| Property  | Type                               | Description                                            |
| --------- | ---------------------------------- | ------------------------------------------------------ |
| `package` | `string`                           | Transformer package name                               |
| `config`  | `object`                           | Transformer-specific configuration                     |
| `code`    | `object`                           | Inline code (`push`, `init`) with `$code:`             |
| `next`    | `string \| Route[] \| RouteConfig` | Next transformer in the chain (conditional via `case`) |

`Route` shape: see [Destination Properties](#destination-properties) above.

A transformer entry with no `code` and no `package` is a **path** — a named
chain that just forwards events through its own `before` and `next` links.
Useful for sharing a `before` chain across multiple destinations without
duplicating arrays.

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

| Property    | Signature                     |
| ----------- | ----------------------------- |
| `fn`        | `(value, context) => result`  |
| `condition` | `(value, context) => boolean` |
| `validate`  | `(value, context) => boolean` |

`context` is a `Mapping.Context` object with `event`, `mapping`, `collector`,
`logger`, and optional `consent`. One-arg signatures still work.

---

## Multi-Flow Configs

```json
{
  "version": 4,
  "flows": {
    "analytics": {
      "config": {
        "platform": "web",
        "bundle": {
          "packages": { "@walkeros/web-destination-gtag": {} }
        }
      },
      "destinations": {
        /* ... */
      }
    },
    "marketing": {
      "config": {
        "platform": "web",
        "bundle": {
          "packages": { "@walkeros/web-destination-meta": {} }
        }
      },
      "destinations": {
        /* ... */
      }
    },
    "server": {
      "config": {
        "platform": "server",
        "bundle": {
          "packages": { "@walkeros/destination-api": {} }
        }
      },
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
  "version": 4,
  "flows": {
    "ecommerce": {
      "config": {
        "platform": "web",
        "bundle": {
          "packages": {
            "@walkeros/web-source": {},
            "@walkeros/web-destination-gtag": {}
          }
        }
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
