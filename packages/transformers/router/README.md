# @walkeros/transformer-router

Router transformer for walkerOS — dynamic chain branching based on ingest
metadata.

## Installation

```bash
npm install @walkeros/transformer-router
```

## Usage

```typescript
import { transformerRouter } from '@walkeros/transformer-router';

const flow = await startFlow({
  transformers: {
    router: {
      code: transformerRouter,
      config: {
        settings: {
          routes: [
            {
              match: { key: 'path', operator: 'prefix', value: '/gtag' },
              next: 'gtag-parser',
            },
            {
              match: { key: 'path', operator: 'prefix', value: '/webhooks' },
              next: 'webhook-parser',
            },
            { match: '*', next: ['validator'] },
          ],
        },
      },
    },
  },
  sources: {
    express: { code: sourceExpress, next: 'router' },
  },
});
```

## How It Works

The router inspects `context.ingest` (set by the source) and evaluates route
rules in order. The first matching route branches the transformer chain to a
different sub-chain. Non-matching events pass through unchanged.

Routes are compiled to closures at init time for fast runtime evaluation.

## Route Configuration

```typescript
interface Route {
  match: MatchExpression | '*'; // Condition or wildcard
  next: string | string[]; // Target transformer chain
}
```

## Match Operators

| Operator   | Description            |
| ---------- | ---------------------- |
| `eq`       | Exact string match     |
| `prefix`   | Starts with            |
| `suffix`   | Ends with              |
| `contains` | Substring match        |
| `regex`    | Regular expression     |
| `gt`       | Greater than (numeric) |
| `lt`       | Less than (numeric)    |
| `exists`   | Key is present         |

All conditions support `not: true` for negation.

## Logical Combinators

Combine conditions with `and`/`or`, nestable to any depth:

```typescript
{
  match: {
    and: [
      { key: 'path', operator: 'prefix', value: '/api' },
      { key: 'method', operator: 'eq', value: 'POST' },
    ],
  },
  next: 'api-parser',
}
```
