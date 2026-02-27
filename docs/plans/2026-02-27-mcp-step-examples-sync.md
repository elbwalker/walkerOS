# MCP Step Examples Sync — Implementation Plan [COMPLETED]

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to
> implement this plan task-by-task.

**Goal:** Close three gaps so the MCP tools can fully leverage step examples for
AI-assisted mapping iteration: add `mapping` to `examples_list`, add `mapping`
to `ExampleLookupResult`, and update `flow-complete.json` with inline step
examples.

**Architecture:** Three independent changes, all additive — no existing behavior
changes. The `mapping` field already exists in `Flow.StepExample`; we just need
to surface it through the tools and provide a reference config that exercises
it.

**Tech Stack:** TypeScript, Zod (output schemas), Jest (tests), JSON (flow
config)

---

## Task 1: Add `mapping` field to `examples_list` MCP tool

Surface the `mapping` field that destination examples carry so an AI agent can
see the mapping rule alongside `in`/`out`.

**Files:**

- Modify: `packages/mcp/mcp-cli/src/schemas/output.ts:82-102`
- Modify: `packages/mcp/mcp-cli/src/tools/examples.ts:59-99`
- Modify: `packages/mcp/mcp-cli/src/__tests__/tools/examples.test.ts`

**Step 1: Write the failing test**

Add a test that verifies the `mapping` field is returned. In
`packages/mcp/mcp-cli/src/__tests__/tools/examples.test.ts`, add a `mapping`
field to the `sampleConfig`'s `purchase` destination example and a new test:

Update the `sampleConfig` `purchase` example (line 44) to include mapping:

```typescript
purchase: {
  in: { name: 'order complete', data: { total: 42 } },
  mapping: {
    name: 'purchase',
    data: { map: { value: 'data.total' } },
  },
  out: [
    { type: 'call', path: 'gtag', args: ['event', 'purchase'] },
  ],
},
```

Add new test:

```typescript
it('includes mapping field for destination examples', async () => {
  mockLoadJsonConfig.mockResolvedValue(sampleConfig as any);

  const tool = server.getTool('examples_list');
  const result = await tool.handler({ configPath: './flow.json' });

  const parsed = JSON.parse(result.content[0].text);
  const purchase = parsed.examples.find(
    (e: any) => e.exampleName === 'purchase',
  );
  expect(purchase.mapping).toEqual({
    name: 'purchase',
    data: { map: { value: 'data.total' } },
  });
  expect(purchase.hasMapping).toBe(true);

  // Source example should not have mapping
  const basic = parsed.examples.find((e: any) => e.exampleName === 'basic');
  expect(basic.mapping).toBeUndefined();
  expect(basic.hasMapping).toBe(false);
});
```

**Step 2: Run test to verify it fails**

Run:
`cd walkerOS && npx jest packages/mcp/mcp-cli/src/__tests__/tools/examples.test.ts --no-coverage`
Expected: FAIL — `mapping` and `hasMapping` not in output

**Step 3: Add `mapping` and `hasMapping` to output schema**

In `packages/mcp/mcp-cli/src/schemas/output.ts`, add two fields to the
`ExamplesListOutputShape` examples array object (after line 98):

```typescript
mapping: z.unknown().optional().describe('Mapping configuration for destinations'),
hasMapping: z.boolean().describe('Whether the example has a mapping configuration'),
```

**Step 4: Extract `mapping` in the examples tool**

In `packages/mcp/mcp-cli/src/tools/examples.ts`, update the example collection
(around line 87-96):

Add `hasMapping` and `mapping` to the push object:

```typescript
examples.push({
  step: `${type}.${name}`,
  stepType: type,
  stepName: name,
  exampleName: exName,
  hasIn: ex.in !== undefined,
  hasOut: ex.out !== undefined,
  hasMapping: ex.mapping !== undefined,
  in: ex.in,
  out: ex.out,
  mapping: ex.mapping,
});
```

Also update the type annotation on the `examples` array (line 59-68) to include
`hasMapping: boolean` and `mapping?: unknown`.

**Step 5: Run test to verify it passes**

Run:
`cd walkerOS && npx jest packages/mcp/mcp-cli/src/__tests__/tools/examples.test.ts --no-coverage`
Expected: PASS

---

## Task 2: Add `mapping` field to `ExampleLookupResult` in CLI

The `findExample()` function currently returns `{ in?, out? }` but not
`mapping`. The simulate command needs this to show mapping context alongside
comparison results.

**Files:**

- Modify:
  `packages/cli/src/commands/simulate/example-loader.ts:5-10,62-75,91-98`
- Modify: `packages/cli/src/commands/simulate/__tests__/example-loader.test.ts`

**Step 1: Write the failing test**

In `packages/cli/src/commands/simulate/__tests__/example-loader.test.ts`, add a
`mapping` field to the purchase example and a new test:

Update the `configWithExamples` `purchase` destination example (line 18) to
include mapping:

```typescript
purchase: {
  in: { name: 'order complete', data: { total: 42 } },
  mapping: {
    name: 'purchase',
    data: { map: { value: 'data.total' } },
  },
  out: [{ type: 'call', path: 'gtag', args: ['event', 'purchase'] }],
},
```

Add new test:

```typescript
it('returns mapping field from destination example', () => {
  const result = findExample(
    configWithExamples,
    'purchase',
    'destination.gtag',
  );
  expect(result.example.mapping).toEqual({
    name: 'purchase',
    data: { map: { value: 'data.total' } },
  });
});

it('returns undefined mapping for examples without one', () => {
  const result = findExample(configWithExamples, 'basic');
  expect(result.example.mapping).toBeUndefined();
});
```

**Step 2: Run test to verify it fails**

Run:
`cd walkerOS && npx jest packages/cli/src/commands/simulate/__tests__/example-loader.test.ts --no-coverage`
Expected: FAIL — `mapping` not in returned example object

**Step 3: Add `mapping` to ExampleLookupResult type and extraction**

In `packages/cli/src/commands/simulate/example-loader.ts`:

Update the `ExampleLookupResult` interface (line 9):

```typescript
example: { in?: unknown; mapping?: unknown; out?: unknown };
```

Update `findExampleInStep` return (line 70-75) — the example is already spread
from the raw object, so just update the type cast on line 74:

```typescript
example: examples[exampleName] as { in?: unknown; mapping?: unknown; out?: unknown },
```

Update `findExampleAcrossSteps` match push (line 98):

```typescript
example: examples[exampleName] as { in?: unknown; mapping?: unknown; out?: unknown },
```

**Step 4: Run test to verify it passes**

Run:
`cd walkerOS && npx jest packages/cli/src/commands/simulate/__tests__/example-loader.test.ts --no-coverage`
Expected: PASS

---

## Task 3: Update `flow-complete.json` with inline step examples

Add realistic inline step examples to the reference flow config so MCP tools can
exercise the full discovery → simulate → validate workflow out of the box.

**Files:**

- Modify: `packages/cli/examples/flow-complete.json`

**Step 1: Add examples to web flow destinations**

Add an `examples` field to the `ga4` destination (after the `mapping` block,
before the closing `}` around line 321). These examples match the mapping rules
already defined in the config:

```json
"examples": {
  "page-view": {
    "in": {
      "name": "page view",
      "data": { "title": "Home", "path": "/" },
      "entity": "page",
      "action": "view"
    },
    "mapping": {
      "name": "page_view",
      "data": {
        "map": {
          "page_title": "data.title",
          "page_location": "data.path"
        }
      }
    },
    "out": ["event", "page_view", { "page_title": "Home", "page_location": "/" }]
  },
  "product-add": {
    "in": {
      "name": "product add",
      "data": {
        "id": "SKU-001",
        "name": "Blue Shirt",
        "price": 49.99,
        "currency": "EUR",
        "quantity": 2
      },
      "entity": "product",
      "action": "add"
    },
    "mapping": {
      "name": "add_to_cart",
      "data": {
        "map": {
          "currency": { "key": "data.currency", "value": "EUR" },
          "value": "data.price",
          "items": {
            "loop": ["this", {
              "map": {
                "item_id": "data.id",
                "item_name": "data.name",
                "quantity": { "key": "data.quantity", "value": 1 }
              }
            }]
          }
        }
      }
    },
    "out": ["event", "add_to_cart", {
      "currency": "EUR",
      "value": 49.99,
      "items": [{ "item_id": "SKU-001", "item_name": "Blue Shirt", "quantity": 2 }]
    }]
  },
  "test-ignored": {
    "in": {
      "name": "test debug",
      "data": { "message": "This should be ignored" },
      "entity": "test",
      "action": "debug"
    },
    "out": false
  }
}
```

**Step 2: Add examples to server flow source**

Add an `examples` field to the `http` source (after `config`, around line 421):

```json
"examples": {
  "post-event": {
    "in": {
      "method": "POST",
      "path": "/collect",
      "headers": { "content-type": "application/json" },
      "body": {
        "name": "page view",
        "data": { "title": "Home", "url": "https://example.com" }
      }
    },
    "out": {
      "name": "page view",
      "data": { "title": "Home", "url": "https://example.com" },
      "entity": "page",
      "action": "view"
    }
  }
}
```

**Step 3: Add examples to server flow destination (meta)**

Add an `examples` field to the `meta` destination (after the `mapping` block,
around line 612):

```json
"examples": {
  "purchase": {
    "in": {
      "name": "order complete",
      "data": {
        "id": "ORD-123",
        "total": 149.97,
        "currency": "EUR"
      },
      "entity": "order",
      "action": "complete"
    },
    "mapping": {
      "name": "Purchase",
      "data": {
        "map": {
          "value": "data.total",
          "currency": { "key": "data.currency", "value": "EUR" },
          "order_id": "data.id"
        }
      }
    },
    "out": {
      "data": [{ "event_name": "Purchase", "custom_data": {
        "value": 149.97,
        "currency": "EUR",
        "order_id": "ORD-123"
      }}]
    }
  }
}
```

**Step 4: Add examples to server flow transformer (filter)**

Add an `examples` field to the `filter` transformer (around line 431):

```json
"examples": {
  "passes-normal": {
    "in": {
      "name": "page view",
      "data": { "title": "Home" },
      "entity": "page",
      "action": "view"
    },
    "out": {
      "name": "page view",
      "data": { "title": "Home" },
      "entity": "page",
      "action": "view"
    }
  },
  "filters-internal": {
    "in": {
      "name": "internal_heartbeat",
      "data": {},
      "entity": "internal",
      "action": "heartbeat"
    },
    "out": false
  }
}
```

**Step 5: Validate the updated config**

Run:
`cd walkerOS && npx walkeros validate flow packages/cli/examples/flow-complete.json --flow web`
Run:
`cd walkerOS && npx walkeros validate flow packages/cli/examples/flow-complete.json --flow server`
Expected: Both pass validation

**Step 6: Verify examples are discoverable via MCP tool**

Run:
`cd walkerOS && npx walkeros examples packages/cli/examples/flow-complete.json --flow web`
Expected: Lists ga4 examples (page-view, product-add, test-ignored)

Run:
`cd walkerOS && npx walkeros examples packages/cli/examples/flow-complete.json --flow server`
Expected: Lists http source (post-event), filter transformer (passes-normal,
filters-internal), meta destination (purchase)

---

## Task 4: Build and run full test suites

Verify all changes work together and nothing is broken.

**Step 1: Build CLI and MCP packages**

Run:
`cd walkerOS && npm run build --workspace=packages/cli --workspace=packages/mcp`
Expected: Clean build

**Step 2: Run CLI tests**

Run: `cd walkerOS && npx jest packages/cli/ --no-coverage` Expected: All tests
pass

**Step 3: Run MCP tests**

Run: `cd walkerOS && npx jest packages/mcp/ --no-coverage` Expected: All tests
pass

---

## Task 5: Sync & Release

**Step 1: Update using-step-examples skill**

Check `walkerOS/skills/using-step-examples/SKILL.md` — add a note in the
"Simulating with Examples" section about the `mapping` field being visible in
`examples_list` output, e.g.:

> The `examples_list` tool returns `mapping` alongside `in`/`out` for
> destination examples, giving full visibility into how input events are
> transformed to vendor-specific output.

**Step 2: Update using-cli skill**

Check `walkerOS/skills/using-cli/SKILL.md` — if it references `examples_list`
output, mention the `mapping` field.

**Step 3: Create changeset**

Create a changeset file for the two affected packages:

```
cd walkerOS && npx changeset
```

Packages: `@walkeros/cli` (patch), `@walkeros/mcp-cli` (patch) Message: "Surface
mapping field in examples_list and ExampleLookupResult"
