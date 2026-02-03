# Unified Chain Handling in Collector

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to
> implement this plan task-by-task.

**Goal:** Unify and standardize chain property handling across sources,
destinations, and transformers in the collector, following DRY principles.

---

## Execution Status (2026-02-03)

| Task                                            | Status       | Notes                                                               |
| ----------------------------------------------- | ------------ | ------------------------------------------------------------------- |
| **Phase 1**                                     |              |                                                                     |
| Task 1.1: Fix initTransformers                  | ✅ COMMITTED | `58d260a7` - Added next extraction, type updated                    |
| Task 1.2: Bundler-style chain tests             | ✅ COMMITTED | `5ffd3909` - 2 tests added to transformer-chain-integration.test.ts |
| Task 1.3: Source.next chain tests               | ⚠️ BLOCKED   | Tests created but **timing out** - needs investigation              |
| **Phase 2**                                     |              |                                                                     |
| Task 2.1: Consolidate extractTransformerNextMap | ⏳ PENDING   |                                                                     |
| Task 2.2: Export walkChain                      | ⏳ PENDING   |                                                                     |
| **Phase 3**                                     |              |                                                                     |
| Task 3.1: Create extractChainProperty           | ⏳ PENDING   |                                                                     |
| Task 3.2: Refactor initTransformers             | ⏳ PENDING   |                                                                     |
| Task 3.3: Refactor initDestinations             | ⏳ PENDING   |                                                                     |
| Task 3.4: Document architecture                 | ⏳ PENDING   |                                                                     |
| Task 3.5: Final verification                    | ⏳ PENDING   |                                                                     |

### Blocking Issue: Task 1.3 Tests Timeout

The source-chain-integration.test.ts tests are timing out (30s each). All 5
tests fail with timeout.

**Hypothesis:** The test pattern of calling
`collector.sources.testSource.push()` directly may not work correctly because:

1. The source's `push` is `env.push` which is the wrapped collector push
2. But `env.push` may have different behavior than expected for pre-chain
   processing
3. Need to investigate how pre-chain is supposed to be triggered

**File created but not committed:**
`packages/collector/src/__tests__/source-chain-integration.test.ts`

---

**Architecture:** The collector currently has duplicated
`extractTransformerNextMap` functions in source.ts and destination.ts, and
inconsistent chain property extraction across init functions. We will
consolidate all chain-related logic into transformer.ts, create a unified
extraction pattern, and add comprehensive integration tests to verify end-to-end
chain execution.

**Tech Stack:** TypeScript, Jest, walkerOS collector package

---

## Background: The Problem

### Current State (Broken)

The collector has three separate init functions with inconsistent chain
handling:

| Function           | Location       | Chain Property | Extraction               | Status     |
| ------------------ | -------------- | -------------- | ------------------------ | ---------- |
| `initSources`      | source.ts      | `next`         | ✅ Extracted at line 33  | Works      |
| `initDestinations` | destination.ts | `before`       | ✅ Extracted at line 506 | Works      |
| `initTransformers` | transformer.ts | `next`         | ❌ **NOT extracted**     | **BROKEN** |

Additionally, `extractTransformerNextMap` is duplicated:

- `source.ts:9-17` - reads `transformer.config.next`
- `destination.ts:27-39` - reads `transformer.config?.next`

### Why Transformer Chains Are Broken

1. Bundler outputs: `{ code, config: {}, next: "enrich" }` (next at top level)
2. `initTransformers` extracts only `{ code, config, env }` - **next is lost**
3. Instance is created without `next` in config
4. `extractTransformerNextMap` reads `instance.config.next` - finds nothing
5. Chain resolution fails silently

### Test Coverage Gap

The existing `transformer-chain-integration.test.ts` works around this by
putting `next` inside the factory return:

```typescript
code: async () => ({
  type: 'first',
  config: { next: 'second' },  // Workaround - in instance
  push: ...
})
```

But bundler output puts `next` at the definition level, not in the factory
return.

---

## Phase 1: Fix the Immediate Bug

### Task 1.1: Add `next` Extraction to `initTransformers`

**Files:**

- Modify: `packages/collector/src/transformer.ts:80-83`
- Test: `packages/collector/src/__tests__/transformer.test.ts`

**Step 1: Write the failing test**

Add to `transformer.test.ts` after the existing `walkChain` tests:

```typescript
describe('initTransformers', () => {
  test('merges next from definition into instance config', async () => {
    const collector = createMockCollector();

    const initTransformers: Transformer.InitTransformers = {
      validate: {
        code: async (context) => ({
          type: 'validator',
          config: context.config,
          push: jest.fn(),
        }),
        config: { settings: { strict: true } },
        next: 'enrich', // next at definition level (bundler output)
      },
    };

    const result = await initTransformersFunc(collector, initTransformers);

    expect(result.validate.config.next).toBe('enrich');
    expect(result.validate.config.settings).toEqual({ strict: true });
  });

  test('handles array next property', async () => {
    const collector = createMockCollector();

    const initTransformers: Transformer.InitTransformers = {
      validate: {
        code: async (context) => ({
          type: 'validator',
          config: context.config,
          push: jest.fn(),
        }),
        next: ['enrich', 'redact'],
      },
    };

    const result = await initTransformersFunc(collector, initTransformers);

    expect(result.validate.config.next).toEqual(['enrich', 'redact']);
  });

  test('does not add next when not specified', async () => {
    const collector = createMockCollector();

    const initTransformers: Transformer.InitTransformers = {
      validate: {
        code: async (context) => ({
          type: 'validator',
          config: context.config,
          push: jest.fn(),
        }),
      },
    };

    const result = await initTransformersFunc(collector, initTransformers);

    expect(result.validate.config.next).toBeUndefined();
  });
});
```

**Step 2: Run test to verify it fails**

```bash
cd /workspaces/developer/walkerOS && npm test --workspace=@walkeros/collector -- transformer.test.ts -t "initTransformers"
```

Expected: FAIL - `result.validate.config.next` is undefined

**Step 3: Update the type to include `next`**

In `packages/core/src/types/transformer.ts`, update `InitTransformer`:

```typescript
export type InitTransformer<T extends TypesGeneric = Types> = {
  code: Init<T>;
  config?: Partial<Config<T>>;
  env?: Partial<Env<T>>;
  next?: string | string[]; // Add this line
};
```

**Step 4: Fix `initTransformers` to extract and merge `next`**

In `packages/collector/src/transformer.ts`, update lines 80-96:

```typescript
for (const [transformerId, transformerDef] of Object.entries(
  initTransformers,
)) {
  const { code, config = {}, env = {}, next } = transformerDef; // Add next extraction

  // Merge next into config before passing to factory
  const configWithNext = next !== undefined ? { ...config, next } : config;

  // Build transformer context for init
  const transformerLogger = collector.logger
    .scope('transformer')
    .scope(transformerId);

  const context = {
    collector,
    logger: transformerLogger,
    id: transformerId,
    config: configWithNext, // Use merged config
    env: env as Transformer.Env,
  };

  // Initialize the transformer instance with context
  const instance = await code(context);

  result[transformerId] = instance;
}
```

**Step 5: Run test to verify it passes**

```bash
cd /workspaces/developer/walkerOS && npm test --workspace=@walkeros/collector -- transformer.test.ts -t "initTransformers"
```

Expected: PASS

**Step 6: Run all transformer tests**

```bash
cd /workspaces/developer/walkerOS && npm test --workspace=@walkeros/collector -- transformer.test.ts
```

Expected: All tests pass

**Step 7: Commit**

```bash
cd /workspaces/developer/walkerOS
git add packages/core/src/types/transformer.ts packages/collector/src/transformer.ts packages/collector/src/__tests__/transformer.test.ts
git commit -m "$(cat <<'EOF'
fix(collector): extract next from transformer definition

The bundler outputs transformer.next at the definition level, but
initTransformers was not extracting it. This caused transformer
chains to silently fail.

- Add next extraction in initTransformers
- Merge next into config before passing to factory
- Add InitTransformer.next type definition

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 1.2: Add Integration Test for Bundler-Style Transformer Chains

**Files:**

- Modify:
  `packages/collector/src/__tests__/transformer-chain-integration.test.ts`

**Step 1: Write the failing test**

Add a new describe block to verify bundler-style chain definitions work:

```typescript
describe('Bundler-style transformer chains (next at definition level)', () => {
  it('resolves transformer.next from definition level', async () => {
    const order: string[] = [];

    const { elb } = await startFlow({
      transformers: {
        first: {
          code: async (context): Promise<Transformer.Instance> => ({
            type: 'first',
            config: context.config, // Config comes from context, includes next
            push: async (event) => {
              order.push('first');
              return event;
            },
          }),
          next: 'second', // next at DEFINITION level (bundler style)
        },
        second: {
          code: async (context): Promise<Transformer.Instance> => ({
            type: 'second',
            config: context.config,
            push: async (event) => {
              order.push('second');
              return event;
            },
          }),
          next: 'third', // next at DEFINITION level
        },
        third: {
          code: async (context): Promise<Transformer.Instance> => ({
            type: 'third',
            config: context.config,
            push: async (event) => {
              order.push('third');
              return event;
            },
          }),
        },
      },
      destinations: {
        testDest: {
          before: 'first',
          code: {
            type: 'test',
            config: {},
            push: async () => {},
          },
        },
      },
    });

    await elb({ name: 'page view', data: {} });

    expect(order).toEqual(['first', 'second', 'third']);
  });

  it('handles mixed definition and instance-level next', async () => {
    const order: string[] = [];

    const { elb } = await startFlow({
      transformers: {
        first: {
          code: async (context): Promise<Transformer.Instance> => ({
            type: 'first',
            config: context.config,
            push: async (event) => {
              order.push('first');
              return event;
            },
          }),
          next: 'second', // Definition level
        },
        second: {
          code: async (): Promise<Transformer.Instance> => ({
            type: 'second',
            config: { next: 'third' }, // Instance level (legacy)
            push: async (event) => {
              order.push('second');
              return event;
            },
          }),
        },
        third: {
          code: async (context): Promise<Transformer.Instance> => ({
            type: 'third',
            config: context.config,
            push: async (event) => {
              order.push('third');
              return event;
            },
          }),
        },
      },
      destinations: {
        testDest: {
          before: 'first',
          code: {
            type: 'test',
            config: {},
            push: async () => {},
          },
        },
      },
    });

    await elb({ name: 'page view', data: {} });

    expect(order).toEqual(['first', 'second', 'third']);
  });
});
```

**Step 2: Run test to verify it passes (after Task 1.1 fix)**

```bash
cd /workspaces/developer/walkerOS && npm test --workspace=@walkeros/collector -- transformer-chain-integration.test.ts -t "Bundler-style"
```

Expected: PASS (if Task 1.1 is complete)

**Step 3: Commit**

```bash
cd /workspaces/developer/walkerOS
git add packages/collector/src/__tests__/transformer-chain-integration.test.ts
git commit -m "$(cat <<'EOF'
test(collector): add integration tests for bundler-style transformer chains

Tests verify that transformer.next works when specified at the
definition level (how the bundler outputs it), not just when
returned from the factory function.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 1.3: Add Integration Test for Source.next Chains

**Files:**

- Create: `packages/collector/src/__tests__/source-chain-integration.test.ts`

**Step 1: Create the test file**

```typescript
import { startFlow } from '..';
import type { Source, Transformer, WalkerOS } from '@walkeros/core';

describe('Source Transformer Chains (source.next)', () => {
  describe('pre-collector chain execution', () => {
    it('executes transformer chain before collector processes event', async () => {
      const transformerCalls: string[] = [];
      const destinationEvents: WalkerOS.Event[] = [];

      const { collector } = await startFlow({
        sources: {
          testSource: {
            code: async (context): Promise<Source.Instance> => {
              const { env, config } = context;
              return {
                type: 'test',
                config: config as Source.Config,
                push: env.push,
              };
            },
            next: 'enrich', // Pre-collector chain
          },
        },
        transformers: {
          enrich: {
            code: async (context): Promise<Transformer.Instance> => ({
              type: 'enricher',
              config: context.config,
              push: async (event) => {
                transformerCalls.push('enrich');
                return { ...event, data: { ...event.data, enriched: true } };
              },
            }),
          },
        },
        destinations: {
          testDest: {
            code: {
              type: 'test',
              config: {},
              push: async (event) => {
                destinationEvents.push(event);
              },
            },
          },
        },
      });

      // Push via source
      await collector.sources.testSource.push({ name: 'page view', data: {} });

      // Wait for async processing
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(transformerCalls).toContain('enrich');
      expect(destinationEvents.length).toBe(1);
      expect(destinationEvents[0].data?.enriched).toBe(true);
    });

    it('chains source.next through transformer.next', async () => {
      const order: string[] = [];

      const { collector } = await startFlow({
        sources: {
          testSource: {
            code: async (context): Promise<Source.Instance> => {
              const { env, config } = context;
              return {
                type: 'test',
                config: config as Source.Config,
                push: env.push,
              };
            },
            next: 'validate', // Start of pre-collector chain
          },
        },
        transformers: {
          validate: {
            code: async (context): Promise<Transformer.Instance> => ({
              type: 'validator',
              config: context.config,
              push: async (event) => {
                order.push('validate');
                return event;
              },
            }),
            next: 'enrich',
          },
          enrich: {
            code: async (context): Promise<Transformer.Instance> => ({
              type: 'enricher',
              config: context.config,
              push: async (event) => {
                order.push('enrich');
                return event;
              },
            }),
          },
        },
        destinations: {
          testDest: {
            code: {
              type: 'test',
              config: {},
              push: async () => {
                order.push('destination');
              },
            },
          },
        },
      });

      await collector.sources.testSource.push({ name: 'page view', data: {} });
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(order).toEqual(['validate', 'enrich', 'destination']);
    });

    it('stops pre-collector chain when transformer returns false', async () => {
      const destinationEvents: WalkerOS.Event[] = [];

      const { collector } = await startFlow({
        sources: {
          testSource: {
            code: async (context): Promise<Source.Instance> => {
              const { env, config } = context;
              return {
                type: 'test',
                config: config as Source.Config,
                push: env.push,
              };
            },
            next: 'filter',
          },
        },
        transformers: {
          filter: {
            code: async (context): Promise<Transformer.Instance> => ({
              type: 'filter',
              config: context.config,
              push: async (event) => {
                if (event.name?.startsWith('internal')) return false;
                return event;
              },
            }),
          },
        },
        destinations: {
          testDest: {
            code: {
              type: 'test',
              config: {},
              push: async (event) => {
                destinationEvents.push(event);
              },
            },
          },
        },
      });

      await collector.sources.testSource.push({
        name: 'internal event',
        data: {},
      });
      await collector.sources.testSource.push({ name: 'page view', data: {} });
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(destinationEvents.length).toBe(1);
      expect(destinationEvents[0].name).toBe('page view');
    });

    it('supports array next for explicit chain control', async () => {
      const order: string[] = [];

      const { collector } = await startFlow({
        sources: {
          testSource: {
            code: async (context): Promise<Source.Instance> => {
              const { env, config } = context;
              return {
                type: 'test',
                config: config as Source.Config,
                push: env.push,
              };
            },
            next: ['a', 'b', 'c'], // Explicit chain (ignores transformer.next)
          },
        },
        transformers: {
          a: {
            code: async (context): Promise<Transformer.Instance> => ({
              type: 'a',
              config: context.config,
              push: async (event) => {
                order.push('a');
                return event;
              },
            }),
            next: 'ignored', // Should be ignored when array provided
          },
          b: {
            code: async (context): Promise<Transformer.Instance> => ({
              type: 'b',
              config: context.config,
              push: async (event) => {
                order.push('b');
                return event;
              },
            }),
          },
          c: {
            code: async (context): Promise<Transformer.Instance> => ({
              type: 'c',
              config: context.config,
              push: async (event) => {
                order.push('c');
                return event;
              },
            }),
          },
          ignored: {
            code: async (context): Promise<Transformer.Instance> => ({
              type: 'ignored',
              config: context.config,
              push: async (event) => {
                order.push('ignored');
                return event;
              },
            }),
          },
        },
        destinations: {
          testDest: {
            code: {
              type: 'test',
              config: {},
              push: async () => {},
            },
          },
        },
      });

      await collector.sources.testSource.push({ name: 'page view', data: {} });
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(order).toEqual(['a', 'b', 'c']);
      expect(order).not.toContain('ignored');
    });
  });

  describe('source without next', () => {
    it('sends events directly to collector without pre-chain', async () => {
      const transformerCalls: string[] = [];
      const destinationEvents: WalkerOS.Event[] = [];

      const { collector } = await startFlow({
        sources: {
          testSource: {
            code: async (context): Promise<Source.Instance> => {
              const { env, config } = context;
              return {
                type: 'test',
                config: config as Source.Config,
                push: env.push,
              };
            },
            // No next - goes directly to collector
          },
        },
        transformers: {
          unused: {
            code: async (context): Promise<Transformer.Instance> => ({
              type: 'unused',
              config: context.config,
              push: async () => {
                transformerCalls.push('unused');
                throw new Error('Should not be called');
              },
            }),
          },
        },
        destinations: {
          testDest: {
            code: {
              type: 'test',
              config: {},
              push: async (event) => {
                destinationEvents.push(event);
              },
            },
          },
        },
      });

      await collector.sources.testSource.push({ name: 'page view', data: {} });
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(transformerCalls).toHaveLength(0);
      expect(destinationEvents.length).toBe(1);
    });
  });
});
```

**Step 2: Run tests**

```bash
cd /workspaces/developer/walkerOS && npm test --workspace=@walkeros/collector -- source-chain-integration.test.ts
```

Expected: PASS

**Step 3: Commit**

```bash
cd /workspaces/developer/walkerOS
git add packages/collector/src/__tests__/source-chain-integration.test.ts
git commit -m "$(cat <<'EOF'
test(collector): add integration tests for source.next chains

Comprehensive tests for pre-collector transformer chains:
- Basic source.next execution
- Chaining through transformer.next
- Chain termination on false return
- Explicit array chain control

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Phase 2: Consolidate Chain Utilities (DRY)

### Task 2.1: Move `extractTransformerNextMap` to transformer.ts

**Files:**

- Modify: `packages/collector/src/transformer.ts`
- Modify: `packages/collector/src/source.ts`
- Modify: `packages/collector/src/destination.ts`
- Test: `packages/collector/src/__tests__/transformer.test.ts`

**Step 1: Write the test for the exported function**

Add to `transformer.test.ts`:

```typescript
import {
  walkChain,
  runTransformerChain,
  transformerInit,
  transformerPush,
  initTransformers as initTransformersFunc,
  extractTransformerNextMap, // Add this import
} from '../transformer';

// Add new describe block
describe('extractTransformerNextMap', () => {
  test('extracts next from transformer instances', () => {
    const transformers: Transformer.Transformers = {
      a: createMockTransformer({ config: { next: 'b' } }),
      b: createMockTransformer({ config: { next: 'c' } }),
      c: createMockTransformer({ config: {} }),
    };

    const result = extractTransformerNextMap(transformers);

    expect(result).toEqual({
      a: { next: 'b' },
      b: { next: 'c' },
      c: {},
    });
  });

  test('handles array next values', () => {
    const transformers: Transformer.Transformers = {
      a: createMockTransformer({ config: { next: ['b', 'c'] } }),
    };

    const result = extractTransformerNextMap(transformers);

    expect(result).toEqual({
      a: { next: ['b', 'c'] },
    });
  });

  test('handles empty transformers', () => {
    const result = extractTransformerNextMap({});
    expect(result).toEqual({});
  });

  test('handles transformers without next', () => {
    const transformers: Transformer.Transformers = {
      a: createMockTransformer({ config: {} }),
    };

    const result = extractTransformerNextMap(transformers);

    expect(result).toEqual({ a: {} });
  });
});
```

**Step 2: Run test to verify it fails (function not exported)**

```bash
cd /workspaces/developer/walkerOS && npm test --workspace=@walkeros/collector -- transformer.test.ts -t "extractTransformerNextMap"
```

Expected: FAIL - `extractTransformerNextMap` is not exported

**Step 3: Add and export `extractTransformerNextMap` in transformer.ts**

Add after the `walkChain` function (around line 65):

```typescript
/**
 * Extracts transformer next configuration for chain walking.
 * Maps transformer instances to their config.next values.
 *
 * This is the single source of truth for extracting chain links.
 * Used by both source.ts (pre-collector chains) and destination.ts (post-collector chains).
 *
 * @param transformers - Map of transformer instances
 * @returns Map of transformer IDs to their next configuration
 */
export function extractTransformerNextMap(
  transformers: Transformer.Transformers,
): Record<string, { next?: string | string[] }> {
  const result: Record<string, { next?: string | string[] }> = {};
  for (const [id, transformer] of Object.entries(transformers)) {
    if (transformer.config?.next) {
      result[id] = { next: transformer.config.next as string | string[] };
    } else {
      result[id] = {};
    }
  }
  return result;
}
```

**Step 4: Run test to verify it passes**

```bash
cd /workspaces/developer/walkerOS && npm test --workspace=@walkeros/collector -- transformer.test.ts -t "extractTransformerNextMap"
```

Expected: PASS

**Step 5: Update source.ts to import from transformer.ts**

In `packages/collector/src/source.ts`:

1. Update import:

```typescript
import { walkChain, extractTransformerNextMap } from './transformer';
```

2. Delete the local `extractTransformerNextMap` function (lines 9-17)

**Step 6: Update destination.ts to import from transformer.ts**

In `packages/collector/src/destination.ts`:

1. Update import:

```typescript
import {
  runTransformerChain,
  walkChain,
  extractTransformerNextMap,
} from './transformer';
```

2. Delete the local `extractTransformerNextMap` function (lines 27-39)

**Step 7: Run all collector tests**

```bash
cd /workspaces/developer/walkerOS && npm test --workspace=@walkeros/collector
```

Expected: All tests pass

**Step 8: Commit**

```bash
cd /workspaces/developer/walkerOS
git add packages/collector/src/transformer.ts packages/collector/src/source.ts packages/collector/src/destination.ts packages/collector/src/__tests__/transformer.test.ts
git commit -m "$(cat <<'EOF'
refactor(collector): consolidate extractTransformerNextMap (DRY)

Move extractTransformerNextMap to transformer.ts as single source of truth.
Previously duplicated in source.ts and destination.ts with subtle differences.

- Export extractTransformerNextMap from transformer.ts
- Import in source.ts and destination.ts
- Add comprehensive unit tests
- Remove duplicate implementations

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2.2: Export `walkChain` in Package Index

**Files:**

- Modify: `packages/collector/src/index.ts`

**Step 1: Verify current exports**

Check that transformer utilities are not exported from index.

**Step 2: Add exports for chain utilities**

Update `packages/collector/src/index.ts`:

```typescript
export * from './types';

export * from './constants';

export * from './consent';
export * from './flow';
export * from './push';
export * from './destination';
export * from './handle';
export * from './on';
export * from './source';
export { walkChain, extractTransformerNextMap } from './transformer';
```

**Step 3: Build to verify exports work**

```bash
cd /workspaces/developer/walkerOS && npm run build --workspace=@walkeros/collector
```

Expected: Build succeeds

**Step 4: Commit**

```bash
cd /workspaces/developer/walkerOS
git add packages/collector/src/index.ts
git commit -m "$(cat <<'EOF'
feat(collector): export chain utilities from package

Export walkChain and extractTransformerNextMap for external use
(e.g., debugging, custom chain resolution).

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Phase 3: Unified Init Pattern

### Task 3.1: Create Unified Chain Property Extractor

**Files:**

- Modify: `packages/collector/src/transformer.ts`
- Test: `packages/collector/src/__tests__/transformer.test.ts`

**Step 1: Write the test**

Add to `transformer.test.ts`:

```typescript
import {
  // ... existing imports
  extractChainProperty, // Add this
} from '../transformer';

describe('extractChainProperty', () => {
  test('extracts and merges chain property into config', () => {
    const definition = {
      code: jest.fn(),
      config: { settings: { foo: 'bar' } },
      next: 'enrich',
    };

    const result = extractChainProperty(definition, 'next');

    expect(result.config).toEqual({
      settings: { foo: 'bar' },
      next: 'enrich',
    });
    expect(result.chainValue).toBe('enrich');
  });

  test('handles before property for destinations', () => {
    const definition = {
      code: { type: 'test', config: {}, push: jest.fn() },
      config: {},
      before: 'redact',
    };

    const result = extractChainProperty(definition, 'before');

    expect(result.config).toEqual({ before: 'redact' });
    expect(result.chainValue).toBe('redact');
  });

  test('handles array chain values', () => {
    const definition = {
      code: jest.fn(),
      config: {},
      next: ['a', 'b', 'c'],
    };

    const result = extractChainProperty(definition, 'next');

    expect(result.config.next).toEqual(['a', 'b', 'c']);
    expect(result.chainValue).toEqual(['a', 'b', 'c']);
  });

  test('returns unchanged config when no chain property', () => {
    const definition = {
      code: jest.fn(),
      config: { settings: { foo: 'bar' } },
    };

    const result = extractChainProperty(definition, 'next');

    expect(result.config).toEqual({ settings: { foo: 'bar' } });
    expect(result.chainValue).toBeUndefined();
  });

  test('does not override existing chain property in config', () => {
    const definition = {
      code: jest.fn(),
      config: { next: 'existing' },
      next: 'override', // Should take precedence
    };

    const result = extractChainProperty(definition, 'next');

    // Definition-level takes precedence (consistent with bundler)
    expect(result.config.next).toBe('override');
  });
});
```

**Step 2: Run test to verify it fails**

```bash
cd /workspaces/developer/walkerOS && npm test --workspace=@walkeros/collector -- transformer.test.ts -t "extractChainProperty"
```

Expected: FAIL - function not defined

**Step 3: Implement `extractChainProperty`**

Add to `packages/collector/src/transformer.ts`:

```typescript
/**
 * Extracts chain property from definition and merges into config.
 * Provides unified handling for source.next, destination.before, and transformer.next.
 *
 * @param definition - Component definition with optional chain property
 * @param propertyName - Name of chain property ('next' or 'before')
 * @returns Object with merged config and extracted chain value
 */
export function extractChainProperty<
  T extends { config?: Record<string, unknown>; [key: string]: unknown },
>(
  definition: T,
  propertyName: 'next' | 'before',
): {
  config: Record<string, unknown>;
  chainValue: string | string[] | undefined;
} {
  const config = definition.config || {};
  const chainValue = definition[propertyName] as string | string[] | undefined;

  if (chainValue !== undefined) {
    return {
      config: { ...config, [propertyName]: chainValue },
      chainValue,
    };
  }

  return { config, chainValue: undefined };
}
```

**Step 4: Run test to verify it passes**

```bash
cd /workspaces/developer/walkerOS && npm test --workspace=@walkeros/collector -- transformer.test.ts -t "extractChainProperty"
```

Expected: PASS

**Step 5: Commit**

```bash
cd /workspaces/developer/walkerOS
git add packages/collector/src/transformer.ts packages/collector/src/__tests__/transformer.test.ts
git commit -m "$(cat <<'EOF'
feat(collector): add extractChainProperty utility

Unified utility for extracting chain properties (next/before) from
component definitions and merging into config. Single source of truth
for chain property handling.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3.2: Refactor `initTransformers` to Use Unified Extractor

**Files:**

- Modify: `packages/collector/src/transformer.ts`

**Step 1: Update `initTransformers` to use `extractChainProperty`**

Replace the manual extraction with:

```typescript
export async function initTransformers(
  collector: Collector.Instance,
  initTransformers: Transformer.InitTransformers = {},
): Promise<Transformer.Transformers> {
  const result: Transformer.Transformers = {};

  for (const [transformerId, transformerDef] of Object.entries(
    initTransformers,
  )) {
    const { code, env = {} } = transformerDef;

    // Use unified chain property extractor
    const { config: configWithChain } = extractChainProperty(
      transformerDef,
      'next',
    );

    // Build transformer context for init
    const transformerLogger = collector.logger
      .scope('transformer')
      .scope(transformerId);

    const context = {
      collector,
      logger: transformerLogger,
      id: transformerId,
      config: configWithChain,
      env: env as Transformer.Env,
    };

    // Initialize the transformer instance with context
    const instance = await code(context);

    result[transformerId] = instance;
  }

  return result;
}
```

**Step 2: Run all transformer tests**

```bash
cd /workspaces/developer/walkerOS && npm test --workspace=@walkeros/collector -- transformer
```

Expected: All tests pass

**Step 3: Commit**

```bash
cd /workspaces/developer/walkerOS
git add packages/collector/src/transformer.ts
git commit -m "$(cat <<'EOF'
refactor(collector): use extractChainProperty in initTransformers

Replace manual next extraction with unified extractChainProperty utility.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3.3: Refactor `initDestinations` to Use Unified Extractor

**Files:**

- Modify: `packages/collector/src/destination.ts`

**Step 1: Update import**

```typescript
import {
  runTransformerChain,
  walkChain,
  extractTransformerNextMap,
  extractChainProperty,
} from './transformer';
```

**Step 2: Update `initDestinations` to use `extractChainProperty`**

```typescript
export async function initDestinations(
  _collector: Collector.Instance,
  destinations: Destination.InitDestinations = {},
): Promise<Collector.Destinations> {
  const result: Collector.Destinations = {};

  for (const [name, destinationDef] of Object.entries(destinations)) {
    const { code, env = {} } = destinationDef;

    // Use unified chain property extractor
    const { config: configWithChain } = extractChainProperty(
      destinationDef,
      'before',
    );

    const mergedConfig = {
      ...code.config,
      ...configWithChain,
    };

    const mergedEnv = mergeEnvironments(code.env, env);

    result[name] = {
      ...code,
      config: mergedConfig,
      env: mergedEnv,
    };
  }

  return result;
}
```

**Step 3: Run all destination tests**

```bash
cd /workspaces/developer/walkerOS && npm test --workspace=@walkeros/collector -- destination
```

Expected: All tests pass

**Step 4: Run chain integration tests**

```bash
cd /workspaces/developer/walkerOS && npm test --workspace=@walkeros/collector -- chain-integration
```

Expected: All tests pass

**Step 5: Commit**

```bash
cd /workspaces/developer/walkerOS
git add packages/collector/src/destination.ts
git commit -m "$(cat <<'EOF'
refactor(collector): use extractChainProperty in initDestinations

Replace manual before extraction with unified extractChainProperty utility.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3.4: Document the Unified Chain Architecture

**Files:**

- Modify: `packages/collector/src/transformer.ts` (JSDoc comments)

**Step 1: Add comprehensive documentation**

Update the file header and key functions with detailed JSDoc:

```typescript
/**
 * @module transformer
 *
 * Transformer Chain Utilities
 * ==========================
 *
 * This module provides the unified implementation for transformer chains in walkerOS.
 * Chains are used at two points in the data flow:
 *
 * 1. Pre-collector chains (source.next):
 *    Source → [Transformer Chain] → Collector
 *    Events are processed before the collector sees them.
 *
 * 2. Post-collector chains (destination.before):
 *    Collector → [Transformer Chain] → Destination
 *    Events are processed before reaching specific destinations.
 *
 * Key Functions:
 * - walkChain(): Resolves chain IDs from starting point
 * - extractTransformerNextMap(): Extracts next links from transformer instances
 * - extractChainProperty(): Unified extraction of chain properties from definitions
 * - runTransformerChain(): Executes a chain of transformers on an event
 *
 * Chain Resolution:
 * - String start: Walk transformer.next links until chain ends
 * - Array start: Use array directly (explicit chain, ignores transformer.next)
 *
 * Chain Termination:
 * - Transformer returns false → chain stops, event is dropped
 * - Transformer throws error → chain stops, event is dropped
 * - Transformer returns void → continue with unchanged event
 * - Transformer returns event → continue with modified event
 */
```

**Step 2: Commit**

```bash
cd /workspaces/developer/walkerOS
git add packages/collector/src/transformer.ts
git commit -m "$(cat <<'EOF'
docs(collector): document unified chain architecture

Add comprehensive JSDoc documentation explaining:
- Pre-collector vs post-collector chains
- Chain resolution algorithm
- Chain termination behavior
- Key functions and their roles

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3.5: Final Verification - Full Test Suite

**Step 1: Run complete collector test suite**

```bash
cd /workspaces/developer/walkerOS && npm test --workspace=@walkeros/collector
```

Expected: All tests pass

**Step 2: Build the collector package**

```bash
cd /workspaces/developer/walkerOS && npm run build --workspace=@walkeros/collector
```

Expected: Build succeeds

**Step 3: Run linting**

```bash
cd /workspaces/developer/walkerOS && npm run lint --workspace=@walkeros/collector
```

Expected: No lint errors

**Step 4: Run full monorepo tests**

```bash
cd /workspaces/developer/walkerOS && npm test
```

Expected: All tests pass

**Step 5: Final commit for verification**

```bash
cd /workspaces/developer/walkerOS
git add -A
git status
# If any uncommitted changes, commit them
```

---

## Summary

### Files Modified

| File                                     | Changes                                                                            |
| ---------------------------------------- | ---------------------------------------------------------------------------------- |
| `packages/core/src/types/transformer.ts` | Add `next` to `InitTransformer` type                                               |
| `packages/collector/src/transformer.ts`  | Add `extractChainProperty`, `extractTransformerNextMap`, update `initTransformers` |
| `packages/collector/src/source.ts`       | Import from transformer.ts, remove duplicate                                       |
| `packages/collector/src/destination.ts`  | Import from transformer.ts, use `extractChainProperty`, remove duplicate           |
| `packages/collector/src/index.ts`        | Export chain utilities                                                             |

### Files Created

| File                                                                | Purpose                                  |
| ------------------------------------------------------------------- | ---------------------------------------- |
| `packages/collector/src/__tests__/source-chain-integration.test.ts` | Integration tests for source.next chains |

### Files Modified (Tests)

| File                                                                     | Changes                                                                           |
| ------------------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| `packages/collector/src/__tests__/transformer.test.ts`                   | Tests for `initTransformers`, `extractTransformerNextMap`, `extractChainProperty` |
| `packages/collector/src/__tests__/transformer-chain-integration.test.ts` | Tests for bundler-style transformer chains                                        |

### Architecture After Refactor

```
transformer.ts (Single Source of Truth)
├── walkChain()                    - Resolve chain from start ID
├── extractTransformerNextMap()    - Extract next links from instances
├── extractChainProperty()         - Unified chain property extraction
├── runTransformerChain()          - Execute chain on event
├── initTransformers()             - Initialize transformers (uses extractChainProperty)
├── transformerInit()              - Lazy init single transformer
└── transformerPush()              - Push event through single transformer

source.ts
└── initSources()                  - Uses extractTransformerNextMap from transformer.ts

destination.ts
├── initDestinations()             - Uses extractChainProperty from transformer.ts
├── pushToDestinations()           - Uses extractTransformerNextMap from transformer.ts
└── getDestinationChain()          - Uses walkChain from transformer.ts
```

---

## Verification Commands

```bash
# Run all collector tests
cd /workspaces/developer/walkerOS
npm test --workspace=@walkeros/collector

# Run specific test suites
npm test --workspace=@walkeros/collector -- transformer.test.ts
npm test --workspace=@walkeros/collector -- transformer-chain-integration.test.ts
npm test --workspace=@walkeros/collector -- source-chain-integration.test.ts

# Build and verify
npm run build --workspace=@walkeros/collector
npm run lint --workspace=@walkeros/collector

# Full monorepo verification
npm test
npm run build
```
