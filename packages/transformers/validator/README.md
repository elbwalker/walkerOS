# @walkeros/transformer-validator

Event validation transformer using JSON Schema.

[Source Code](https://github.com/elbwalker/walkerOS/tree/main/packages/transformers/validator)
| [NPM](https://www.npmjs.com/package/@walkeros/transformer-validator) |
[Documentation](https://www.walkeros.io/docs/transformers/validator)

## Quick Start

```json
{
  "transformers": {
    "validate": {
      "package": "@walkeros/transformer-validator",
      "config": {
        "logger": { "level": "DEBUG" },
        "settings": {
          "format": true,
          "contract": {
            "product": {
              "add": {
                "schema": {
                  "properties": {
                    "data": { "required": ["id", "name"] }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}
```

## Features

- **Format validation**: Validates full WalkerOS.Event structure
- **Contract validation**: Entity/action-specific business rules
- **Wildcards**: Match multiple events with `*` patterns
- **Conditional rules**: Apply different schemas based on event data

## Installation

```bash
npm install @walkeros/transformer-validator
```

## Configuration

| Property   | Type                                                                            | Description                                         |
| ---------- | ------------------------------------------------------------------------------- | --------------------------------------------------- |
| `format`   | `boolean`                                                                       | Validate WalkerOS.Event structure (default: `true`) |
| `contract` | [`Contract`](https://www.walkeros.io/docs/transformers/validator#configuration) | Entity/action validation rules (see docs)           |

## Related

- [Documentation](https://www.walkeros.io/docs/transformers/validator)
- [Transformers Overview](https://www.walkeros.io/docs/transformers)
