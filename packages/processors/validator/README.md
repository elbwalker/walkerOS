# @walkeros/processor-validator

Event validation processor using JSON Schema.

[Source Code](https://github.com/elbwalker/walkerOS/tree/main/packages/processors/validator)
| [NPM](https://www.npmjs.com/package/@walkeros/processor-validator) |
[Documentation](https://www.walkeros.io/docs/processors/validator)

## Quick Start

```json
{
  "processors": {
    "validate": {
      "package": "@walkeros/processor-validator",
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
npm install @walkeros/processor-validator
```

## Configuration

| Property   | Type                                                                          | Description                                         |
| ---------- | ----------------------------------------------------------------------------- | --------------------------------------------------- |
| `format`   | `boolean`                                                                     | Validate WalkerOS.Event structure (default: `true`) |
| `contract` | [`Contract`](https://www.walkeros.io/docs/processors/validator#configuration) | Entity/action validation rules (see docs)           |

## Related

- [Documentation](https://www.walkeros.io/docs/processors/validator)
- [Processors Overview](https://www.walkeros.io/docs/processors)
