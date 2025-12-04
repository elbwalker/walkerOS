---
name: create-source
description:
  Use when creating a new walkerOS source (web or server). Step-by-step workflow
  for capturing events from new platforms.
---

# Create a New Source

## Prerequisites

Before starting, read these skills:

- [understanding-flow](../understanding-flow/SKILL.md) - How sources fit in
  architecture
- [understanding-sources](../understanding-sources/SKILL.md) - Source interface
- [understanding-events](../understanding-events/SKILL.md) - Event structure
  sources emit
- [understanding-mapping](../understanding-mapping/SKILL.md) - Transform raw
  input to events
- [testing-strategy](../testing-strategy/SKILL.md) - How to test

## Source Types

| Type   | Platform | Input                 | Example                    |
| ------ | -------- | --------------------- | -------------------------- |
| Web    | Browser  | DOM events, dataLayer | `browser`, `dataLayer`     |
| Server | Node.js  | HTTP requests         | `gcp`, `express`, `lambda` |

## Process Checklist

### 1. Research Phase

- [ ] Identify input format (HTTP body, DOM structure, dataLayer schema)
- [ ] Define how input maps to walkerOS events
- [ ] Check existing similar sources for patterns
- [ ] Determine if web or server source

### 2. Scaffold Phase

**Template sources:**

- Web: `packages/web/sources/dataLayer/`
- Server: `packages/server/sources/express/`

```bash
# Copy template (example: web source)
cp -r packages/web/sources/dataLayer packages/web/sources/[name]

# Update package.json
cd packages/web/sources/[name]
# Edit: name, description, repository.directory
```

**Directory structure:**

```
packages/[web|server]/sources/[name]/
├── src/
│   ├── index.ts           # Main source export
│   ├── push.ts            # Push implementation (or handler.ts for server)
│   ├── types/
│   │   └── index.ts       # Config, Input interfaces
│   ├── dev/               # Test examples
│   │   ├── index.ts
│   │   └── examples.ts
│   └── __tests__/
│       └── index.test.ts
├── package.json
├── tsconfig.json
├── tsup.config.ts
├── jest.config.mjs
└── README.md
```

### 3. Implementation Phase

**Step 1: Define types** (`src/types/index.ts`)

```typescript
import type { WalkerOS } from '@walkeros/core';

export interface Config {
  // Source configuration
  mapping?: WalkerOS.Mapping;
  // Custom options
}

export interface Input {
  // What the source receives
  // For HTTP: request body
  // For DOM: element data
}
```

**Step 2: Implement push** (`src/push.ts`)

The push function IS the handler - no wrappers needed.

```typescript
import { getMappingValue, createEvent } from '@walkeros/core';
import type { Config, Input } from './types';

export async function push(
  input: Input,
  config: Config,
): Promise<WalkerOS.Event[]> {
  // Transform raw input to walkerOS event(s)
  const events: WalkerOS.Event[] = [];

  // Parse input
  const data = parseInput(input);

  // Create event using mapping or direct transform
  const event = createEvent({
    name: `${data.entity} ${data.action}`,
    data: getMappingValue(config.mapping?.data, data) ?? data,
  });

  events.push(event);
  return events;
}
```

**For server sources** (HTTP handler pattern):

```typescript
import type { Request, Response } from 'express';

export async function push(req: Request, res: Response): Promise<void> {
  try {
    const events = transformRequest(req.body);
    // Forward to collector or respond
    res.status(200).json({ events });
  } catch (error) {
    res.status(400).json({ error: 'Invalid input' });
  }
}

// Direct deployment: http('handler', source.push)
```

**Step 3: Create dev examples** (`src/dev/examples.ts`)

```typescript
export const inputs = {
  validPageView: {
    event: 'page view',
    page: { title: 'Home', path: '/' },
  },
  validProductAdd: {
    event: 'product add',
    product: { id: 'P123', name: 'Test' },
  },
};

export const config = {
  basic: {
    mapping: {
      data: { map: { title: 'page.title' } },
    },
  },
};
```

### 4. Testing Phase

**Test input transformation:**

```typescript
import { push } from '../push';
import { examples } from '../dev';

describe('source push', () => {
  it('transforms input to walkerOS event', async () => {
    const events = await push(
      examples.inputs.validPageView,
      examples.config.basic,
    );

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      name: 'page view',
      data: expect.objectContaining({ title: 'Home' }),
    });
  });

  it('handles invalid input gracefully', async () => {
    const events = await push({}, examples.config.basic);
    expect(events).toHaveLength(0);
  });
});
```

**For server sources, test HTTP handling:**

```typescript
import { push } from '../push';

describe('HTTP handler', () => {
  it('responds 200 on valid request', async () => {
    const req = { body: examples.inputs.validPageView };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    await push(req as any, res as any);

    expect(res.status).toHaveBeenCalledWith(200);
  });
});
```

**Run tests:**

```bash
cd packages/[web|server]/sources/[name]
npm run test
```

### 5. Documentation Phase

**README.md template:**

```markdown
# @walkeros/[web|server]-source-[name]

> walkerOS source for [Platform/Input Type]

## Installation

\`\`\`bash npm install @walkeros/[web|server]-source-[name] \`\`\`

## Quick Start

\`\`\`typescript import { startFlow } from '@walkeros/collector'; import source
from '@walkeros/[web|server]-source-[name]';

const { elb } = await startFlow({ sources: { [name]: { ...source, config: { /_
... _/ }, }, }, }); \`\`\`

## Input Format

| Field | Type   | Description                          |
| ----- | ------ | ------------------------------------ |
| event | string | Event name in "entity action" format |
| data  | object | Event data                           |

## Configuration

| Option  | Type   | Default | Description              |
| ------- | ------ | ------- | ------------------------ |
| mapping | object | -       | Transform input to event |
```

### 6. Validation

- [ ] `npm run build` passes
- [ ] `npm run test` passes
- [ ] `npm run lint` passes
- [ ] README is complete
- [ ] Input validation handles edge cases

## Reference Files

| What            | Where                               |
| --------------- | ----------------------------------- |
| Web template    | `packages/web/sources/dataLayer/`   |
| Server template | `packages/server/sources/express/`  |
| Source types    | `packages/core/src/types/source.ts` |
| Event creation  | `packages/core/src/lib/event.ts`    |

## Related

- [understanding-sources skill](../understanding-sources/SKILL.md)
- [understanding-events skill](../understanding-events/SKILL.md)
- [testing-strategy skill](../testing-strategy/SKILL.md)
- [← Back to Hub](../../AGENT.md)
