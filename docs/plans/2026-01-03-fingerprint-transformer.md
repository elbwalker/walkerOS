# Fingerprint Transformer Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to
> implement this plan task-by-task.

**Goal:** Create a server transformer that hashes configurable fields to
generate user fingerprints for session continuity.

**Architecture:** Two-part implementation: (1) Add `ingest` field to PushContext
and Transformer.Context for sources to pass request metadata, (2) Create
fingerprint transformer that reads fields via dot notation and hashes them.

**Tech Stack:** TypeScript, Node.js crypto (getHashServer), existing byPath
utilities

---

## Part 1: Ingest Context Foundation

### Task 1: Add ingest to PushContext type

**Files:**

- Modify: `packages/core/src/types/collector.ts`

**Step 1: Read current PushContext interface**

Run: Read the file to find PushContext interface

**Step 2: Add ingest field to PushContext**

```typescript
export interface PushContext {
  mapping?: Mapping.Config;
  preChain?: string[];
  ingest?: unknown; // Generic ingest context from source
}
```

**Step 3: Build to verify types compile**

Run: `npm run build -w @elbwalker/core` Expected: PASS

**Step 4: Commit**

```bash
git add packages/core/src/types/collector.ts
git commit -m "feat(core): add ingest field to PushContext"
```

---

### Task 2: Add ingest to Transformer.Context type

**Files:**

- Modify: `packages/core/src/types/transformer.ts`

**Step 1: Read current Context interface**

Run: Read the file to find Context interface

**Step 2: Add ingest field to Context**

```typescript
export interface Context<T extends TypesGeneric = Types> {
  collector: Collector.Instance;
  config: Config<T>;
  env: Env<T>;
  logger: Logger.Instance;
  ingest?: unknown; // Forwarded from PushContext
}
```

**Step 3: Build to verify types compile**

Run: `npm run build -w @elbwalker/core` Expected: PASS

**Step 4: Commit**

```bash
git add packages/core/src/types/transformer.ts
git commit -m "feat(core): add ingest field to Transformer.Context"
```

---

### Task 3: Forward ingest through push pipeline

**Files:**

- Modify: `packages/collector/src/push.ts`

**Step 1: Read push.ts to understand current flow**

Run: Read the file to find where context is used

**Step 2: Capture ingest from context and pass to runTransformerChain**

The ingest needs to be passed through to transformer chain execution. Find where
`runTransformerChain` is called and ensure ingest is available.

**Step 3: Build to verify**

Run: `npm run build -w @elbwalker/collector` Expected: PASS

**Step 4: Commit**

```bash
git add packages/collector/src/push.ts
git commit -m "feat(collector): forward ingest through push pipeline"
```

---

### Task 4: Include ingest in transformer context construction

**Files:**

- Modify: `packages/collector/src/transformer.ts`

**Step 1: Read transformer.ts to find context construction**

Run: Read the file to find where Transformer.Context is built (around line
172-177)

**Step 2: Add ingest to context object**

Find where context is constructed:

```typescript
const context: Transformer.Context = {
  collector,
  config: transformer.config,
  env: mergeTransformerEnvironments(transformer.config.env),
  logger: transformerLogger,
  ingest, // ADD THIS - passed from push context
};
```

**Step 3: Update function signatures to accept ingest**

Ensure `runTransformerChain` and `transformerPush` accept ingest parameter.

**Step 4: Build to verify**

Run: `npm run build -w @elbwalker/collector` Expected: PASS

**Step 5: Commit**

```bash
git add packages/collector/src/transformer.ts
git commit -m "feat(collector): include ingest in transformer context"
```

---

### Task 5: Make ingest available to destinations

**Files:**

- Modify: `packages/collector/src/destination.ts`

**Step 1: Read destination.ts to understand flow**

Run: Read the file to find where transformer chain is called for destinations

**Step 2: Pass ingest to post-transformer chain**

Ensure ingest flows through to destination transformers.

**Step 3: Build to verify**

Run: `npm run build -w @elbwalker/collector` Expected: PASS

**Step 4: Commit**

```bash
git add packages/collector/src/destination.ts
git commit -m "feat(collector): make ingest available to destinations"
```

---

### Task 6: Write integration test for ingest flow

**Files:**

- Create: `packages/collector/src/__tests__/ingest.test.ts`

**Step 1: Write failing test**

```typescript
import { createCollector } from '../';
import type { Transformer, WalkerOS } from '@elbwalker/core';

describe('ingest context', () => {
  it('passes ingest from push to transformer context', async () => {
    let receivedIngest: unknown;

    const testTransformer: Transformer.Init = () => ({
      type: 'test',
      config: {},
      push(event, context) {
        receivedIngest = context.ingest;
        return event;
      },
    });

    const { elb, instance } = createCollector({
      transformers: {
        test: { code: testTransformer },
      },
      sources: {
        manual: { next: 'test' },
      },
    });

    await instance.push(
      { event: 'test' },
      { ingest: { ip: '192.168.1.1', userAgent: 'TestAgent' } },
    );

    expect(receivedIngest).toEqual({
      ip: '192.168.1.1',
      userAgent: 'TestAgent',
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -w @elbwalker/collector -- --testPathPattern=ingest` Expected:
FAIL (test file doesn't exist or ingest not passed)

**Step 3: Verify test passes after implementation**

Run: `npm test -w @elbwalker/collector -- --testPathPattern=ingest` Expected:
PASS

**Step 4: Commit**

```bash
git add packages/collector/src/__tests__/ingest.test.ts
git commit -m "test(collector): add integration test for ingest flow"
```

---

## Part 2: Fingerprint Transformer

### Task 7: Create fingerprint transformer package scaffold

**Files:**

- Create: `packages/transformers/fingerprint/package.json`
- Create: `packages/transformers/fingerprint/tsconfig.json`
- Create: `packages/transformers/fingerprint/src/index.ts`
- Create: `packages/transformers/fingerprint/src/types.ts`

**Step 1: Create package.json**

```json
{
  "name": "@elbwalker/transformer-fingerprint",
  "version": "0.0.1",
  "description": "Fingerprint transformer for walkerOS",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "test": "jest"
  },
  "dependencies": {
    "@elbwalker/core": "workspace:*",
    "@elbwalker/server-core": "workspace:*"
  },
  "devDependencies": {
    "typescript": "^5.0.0"
  },
  "files": ["dist"],
  "license": "MIT"
}
```

**Step 2: Create tsconfig.json**

```json
{
  "extends": "../../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"]
}
```

**Step 3: Create types.ts**

```typescript
import type { Transformer, WalkerOS } from '@elbwalker/core';

export type FieldFn = (
  event: WalkerOS.DeepPartialEvent,
  context: Transformer.Context,
) => unknown;

export type Field = string | FieldFn;

export interface Settings {
  fields: Field[];
  output?: string; // dot notation path, default: 'user.hash'
  length?: number; // hash truncation length
}

export interface Types extends Transformer.Types<Settings> {}
```

**Step 4: Create index.ts stub**

```typescript
import type { Transformer } from '@elbwalker/core';
import type { Types } from './types';

export * from './types';

export const transformerFingerprint: Transformer.Init<Types> = (config) => {
  return {
    type: 'fingerprint',
    config: { ...config },
    push(event) {
      return event; // Stub - implement in next task
    },
  };
};
```

**Step 5: Install dependencies**

Run: `npm install`

**Step 6: Build to verify**

Run: `npm run build -w @elbwalker/transformer-fingerprint` Expected: PASS

**Step 7: Commit**

```bash
git add packages/transformers/fingerprint/
git commit -m "feat(transformer-fingerprint): scaffold package"
```

---

### Task 8: Write failing test for fingerprint transformer

**Files:**

- Create: `packages/transformers/fingerprint/src/__tests__/index.test.ts`

**Step 1: Write failing test**

```typescript
import { transformerFingerprint } from '../';
import type { Transformer, WalkerOS } from '@elbwalker/core';

describe('transformerFingerprint', () => {
  const mockContext = {
    collector: {} as any,
    config: {},
    env: {},
    logger: {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as any,
    ingest: {
      ip: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
      origin: 'https://example.com',
    },
  } as Transformer.Context;

  it('hashes string fields from context.ingest', async () => {
    const transformer = transformerFingerprint({
      settings: {
        fields: ['ingest.ip', 'ingest.userAgent'],
        output: 'user.hash',
        length: 16,
      },
    });

    const event: WalkerOS.DeepPartialEvent = { event: 'test' };
    const result = await transformer.push(event, mockContext);

    expect(result).toBeDefined();
    expect((result as any).user?.hash).toBeDefined();
    expect((result as any).user?.hash.length).toBe(16);
  });

  it('supports function fields', async () => {
    const transformer = transformerFingerprint({
      settings: {
        fields: ['ingest.ip', () => new Date().getDate()],
        output: 'user.fingerprint',
      },
    });

    const event: WalkerOS.DeepPartialEvent = { event: 'test' };
    const result = await transformer.push(event, mockContext);

    expect(result).toBeDefined();
    expect((result as any).user?.fingerprint).toBeDefined();
  });

  it('uses default output path user.hash', async () => {
    const transformer = transformerFingerprint({
      settings: {
        fields: ['ingest.ip'],
      },
    });

    const event: WalkerOS.DeepPartialEvent = { event: 'test' };
    const result = await transformer.push(event, mockContext);

    expect((result as any).user?.hash).toBeDefined();
  });

  it('reads fields from event via dot notation', async () => {
    const transformer = transformerFingerprint({
      settings: {
        fields: ['data.userId', 'ingest.ip'],
        output: 'user.hash',
      },
    });

    const event: WalkerOS.DeepPartialEvent = {
      event: 'test',
      data: { userId: 'user123' },
    };
    const result = await transformer.push(event, mockContext);

    expect((result as any).user?.hash).toBeDefined();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -w @elbwalker/transformer-fingerprint` Expected: FAIL (stub
returns event unchanged, no hash)

**Step 3: Commit failing test**

```bash
git add packages/transformers/fingerprint/src/__tests__/
git commit -m "test(transformer-fingerprint): add failing tests"
```

---

### Task 9: Implement fingerprint transformer

**Files:**

- Modify: `packages/transformers/fingerprint/src/index.ts`

**Step 1: Implement the transformer**

```typescript
import type { Transformer, WalkerOS } from '@elbwalker/core';
import { getByPath, setByPath } from '@elbwalker/core';
import { getHashServer } from '@elbwalker/server-core';
import type { Types, Field } from './types';

export * from './types';

function resolveField(
  field: Field,
  event: WalkerOS.DeepPartialEvent,
  context: Transformer.Context,
): unknown {
  if (typeof field === 'function') {
    return field(event, context);
  }

  // Try event first, then context
  const fromEvent = getByPath(event, field);
  if (fromEvent !== undefined) {
    return fromEvent;
  }

  return getByPath(context, field);
}

export const transformerFingerprint: Transformer.Init<Types> = (config) => {
  const settings = {
    output: 'user.hash',
    ...config?.settings,
  };

  return {
    type: 'fingerprint',
    config: { ...config, settings },

    async push(event, context) {
      const { fields, output, length } = settings;

      if (!fields || fields.length === 0) {
        return event;
      }

      // Resolve all field values
      const values = fields.map((field) => resolveField(field, event, context));

      // Concatenate and hash
      const input = values.map((v) => String(v ?? '')).join('');
      const hash = await getHashServer(input, length);

      // Set output at configured path
      return setByPath(event, output, hash);
    },
  };
};
```

**Step 2: Run tests to verify they pass**

Run: `npm test -w @elbwalker/transformer-fingerprint` Expected: PASS

**Step 3: Commit**

```bash
git add packages/transformers/fingerprint/src/index.ts
git commit -m "feat(transformer-fingerprint): implement field resolution and hashing"
```

---

### Task 10: Build and verify full package

**Files:**

- Verify: `packages/transformers/fingerprint/`

**Step 1: Build the package**

Run: `npm run build -w @elbwalker/transformer-fingerprint` Expected: PASS

**Step 2: Run all collector tests to ensure no regressions**

Run: `npm test -w @elbwalker/collector` Expected: PASS

**Step 3: Run all core tests**

Run: `npm test -w @elbwalker/core` Expected: PASS

**Step 4: Final commit**

```bash
git add .
git commit -m "feat(transformer-fingerprint): complete implementation"
```

---

## Summary

**Files Modified:**

- `packages/core/src/types/collector.ts` - ingest field in PushContext
- `packages/core/src/types/transformer.ts` - ingest field in Context
- `packages/collector/src/push.ts` - forward ingest
- `packages/collector/src/transformer.ts` - include ingest in context
- `packages/collector/src/destination.ts` - make ingest available

**Files Created:**

- `packages/transformers/fingerprint/` - new package with transformer
  implementation

**Usage Example:**

```typescript
import { transformerFingerprint } from '@elbwalker/transformer-fingerprint';
import { anonymizeIP } from '@elbwalker/utils';

const config = {
  transformers: {
    fingerprint: {
      code: transformerFingerprint,
      config: {
        settings: {
          fields: [
            'ingest.origin',
            'ingest.userAgent',
            'ingest.language',
            (_, ctx) => anonymizeIP((ctx.ingest as any)?.ip || ''),
            () => new Date().getDate(),
          ],
          output: 'user.hash',
          length: 16,
        },
      },
    },
  },
};
```
