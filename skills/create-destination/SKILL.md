---
name: create-destination
description:
  Use when creating a new walkerOS destination (web or server). Step-by-step
  workflow from research to documentation.
---

# Create a New Destination

## Prerequisites

Before starting, read these skills:

- [understanding-flow](../understanding-flow/SKILL.md) - How destinations fit in
  architecture
- [understanding-destinations](../understanding-destinations/SKILL.md) -
  Destination interface
- [understanding-mapping](../understanding-mapping/SKILL.md) - Event
  transformation
- [testing-strategy](../testing-strategy/SKILL.md) - How to test with env
  pattern

## Process Checklist

### 1. Research Phase

- [ ] Identify target platform API documentation
- [ ] List required credentials/configuration (API keys, IDs, endpoints)
- [ ] Define default event mappings (walkerOS event → vendor format)
- [ ] Check existing similar destinations for patterns

### 2. Scaffold Phase

**Template destination:** `packages/web/destinations/plausible/`

```bash
# Copy template
cp -r packages/web/destinations/plausible packages/web/destinations/[name]

# Update package.json
cd packages/web/destinations/[name]
# Edit: name, description, repository.directory
```

**Actual directory structure:**

```
packages/web/destinations/[name]/
├── src/
│   ├── index.ts           # Main destination object (init + push)
│   ├── index.test.ts      # Tests
│   ├── dev.ts             # Exports schemas and examples
│   ├── examples/          # Test fixtures
│   │   ├── index.ts       # Re-exports
│   │   ├── env.ts         # Mock environment
│   │   ├── events.ts      # Sample events
│   │   └── mapping.ts     # Sample mappings
│   ├── schemas/           # Zod schemas
│   │   └── index.ts
│   └── types/
│       └── index.ts       # Settings, Config, Destination types
├── package.json
├── tsconfig.json
├── tsup.config.ts
├── jest.config.mjs
└── README.md
```

### 3. Implementation Phase

**Step 1: Define types** (`src/types/index.ts`)

```typescript
import type { DestinationWeb } from '@walkeros/web-core';

export interface Settings {
  domain?: string;
  // Add destination-specific settings
}

export interface Config extends DestinationWeb.Config<Settings> {}

export interface Destination extends DestinationWeb.Destination<Config> {}
```

**Step 2: Implement destination** (`src/index.ts`)

The destination is a single object with `type`, `config`, `init`, and `push`:

```typescript
import type { Config, Destination } from './types';
import type { DestinationWeb } from '@walkeros/web-core';
import { isObject } from '@walkeros/core';
import { getEnv } from '@walkeros/web-core';

export * as DestinationYourName from './types';

export const destinationYourName: Destination = {
  type: 'yourname',

  config: {},

  init({ config, env }) {
    const { window } = getEnv(env);
    const settings = config.settings || {};

    // Load vendor script if needed
    if (config.loadScript) addScript(settings, env);

    // Initialize vendor SDK
    (window as Window).vendorSdk =
      (window as Window).vendorSdk ||
      function () {
        // Queue calls until loaded
      };

    return config;
  },

  push(event, { config, data, env }) {
    const params = isObject(data) ? data : {};
    const { window } = getEnv(env);

    // Call vendor API
    (window as Window).vendorSdk('track', event.name, params);
  },
};

export default destinationYourName;
```

**Step 3: Create examples** (`src/examples/`)

`src/examples/env.ts`:

```typescript
import type { DestinationWeb } from '@walkeros/web-core';

export const env: { push: DestinationWeb.Env } = {
  push: {
    window: {
      vendorSdk: jest.fn(),
    } as unknown as Window,
    document: {} as Document,
  },
};
```

`src/examples/events.ts`:

```typescript
import type { WalkerOS } from '@walkeros/core';

export const events: Record<string, WalkerOS.Event> = {
  pageView: {
    name: 'page view',
    data: { title: 'Test', path: '/' },
    // ... other required event fields
  },
};
```

`src/dev.ts`:

```typescript
export * as schemas from './schemas';
export * as examples from './examples';
```

### 4. Testing Phase

**Test file:** `src/index.test.ts`

```typescript
import type { DestinationWeb } from '@walkeros/web-core';
import { destinationYourName } from '.';
import { examples } from './dev';

describe('destinationYourName', () => {
  const config: DestinationWeb.Config = {};

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('push calls vendor SDK', () => {
    const mockSdk = jest.fn();
    const env = {
      ...examples.env.push,
      window: { vendorSdk: mockSdk } as unknown as Window,
    };

    destinationYourName.push(examples.events.pageView, {
      config,
      env,
    });

    expect(mockSdk).toHaveBeenCalledWith(
      'track',
      'page view',
      expect.any(Object),
    );
  });
});
```

**Run tests:**

```bash
cd packages/web/destinations/[name]
npm run test
```

### 5. Documentation Phase

**README.md template:**

```markdown
# @walkeros/web-destination-[name]

> walkerOS destination for [Vendor Name]

## Installation

\`\`\`bash npm install @walkeros/web-destination-[name] \`\`\`

## Quick Start

\`\`\`typescript import { startFlow } from '@walkeros/collector'; import
destinationYourName from '@walkeros/web-destination-[name]';

const { elb } = await startFlow({ destinations: { yourname: {
...destinationYourName, config: { settings: { /_ your settings _/ }, }, }, },
}); \`\`\`

## Configuration

| Setting | Type   | Required | Description |
| ------- | ------ | -------- | ----------- |
| domain  | string | No       | Your domain |
```

### 6. Validation

- [ ] `npm run build` passes
- [ ] `npm run test` passes
- [ ] `npm run lint` passes
- [ ] README is complete

## Reference Files

| What            | Where                                        |
| --------------- | -------------------------------------------- |
| Simple template | `packages/web/destinations/plausible/`       |
| Complex example | `packages/web/destinations/gtag/`            |
| Types           | `packages/web/core/src/types/destination.ts` |

## Related

- [understanding-destinations skill](../understanding-destinations/SKILL.md)
- [testing-strategy skill](../testing-strategy/SKILL.md)
- [← Back to Hub](../../AGENT.md)
