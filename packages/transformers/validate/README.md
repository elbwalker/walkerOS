<p align="left">
  <a href="https://www.walkeros.io">
    <img alt="walkerOS" title="walkerOS" src="https://www.walkeros.io/img/walkerOS_logo.svg" width="256px"/>
  </a>
</p>

# @walkeros/transformer-validate

Enforce JSON Schema contracts on walkerOS events at runtime. Checks each event
against its contract and records a verdict, either annotating the event and
continuing or dropping it. Runs on both web and server.

[Documentation](https://www.walkeros.io/docs/transformers/validate) &bull;
[NPM Package](https://www.npmjs.com/package/@walkeros/transformer-validate)
&bull;
[Source Code](https://github.com/elbwalker/walkerOS/tree/main/packages/transformers/validate)

## Installation

```bash
npm install @walkeros/transformer-validate
```

## Quick start

```typescript
import { startFlow } from '@walkeros/collector';
import { transformerValidate } from '@walkeros/transformer-validate';

await startFlow({
  transformers: {
    validate: {
      code: transformerValidate,
      config: { settings: { contract: [contractWeb], mode: 'strict' } },
    },
  },
});
```

The same step in a bundled flow, referencing a named contract from the top-level
`contract` block:

```json
{
  "version": 4,
  "contract": {
    "web": {
      "events": {
        "order": {
          "complete": {
            "properties": { "data": { "required": ["total", "currency"] } }
          }
        }
      }
    }
  },
  "flows": {
    "default": {
      "transformers": {
        "validate": {
          "package": "@walkeros/transformer-validate",
          "config": {
            "settings": { "contract": ["$contract.web"], "mode": "strict" }
          },
          "next": "ga4"
        }
      }
    }
  }
}
```

## Modes

`mode` decides what happens to an invalid event:

- **`pass`** (default) writes the verdict to the event and continues, so a
  downstream step can route on `event.source.valid`.
- **`strict`** records the errors and stops the chain, so the event never
  reaches downstream steps.

The boolean verdict goes onto the event as data that travels with it. The issue
list goes onto the ingest as diagnostics, so it survives even a strict-mode
drop.

## Documentation

Full configuration, contract references, and examples live in the docs:
**https://www.walkeros.io/docs/transformers/validate**

## Contribute

Feel free to contribute by submitting an
[issue](https://github.com/elbwalker/walkerOS/issues), starting a
[discussion](https://github.com/elbwalker/walkerOS/discussions), or getting in
[contact](https://calendly.com/elb-alexander/30min).

## License

MIT
