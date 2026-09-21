# walkerOS Quickstart Examples

This package contains verified, working code examples for walkerOS
documentation. All examples are tested and linted to ensure accuracy.

## Purpose

- Provide copy-paste ready code examples
- Ensure documentation accuracy through testing
- Demonstrate minimal working configurations
- Catch breaking changes early

## Structure

```
src/
├── __tests__/         # One test file per example
├── batch-all.ts       # Batch every event of a destination
├── first-event.ts     # First event with a console destination
├── ga4-ecommerce.ts   # GA4 add_to_cart mapping
├── mapping-test.ts    # Source and destination mapping
└── web-basic.ts       # Browser source with API and gtag destinations
```

## Usage

### Running Tests

```bash
npm run test
```

### Watch Mode

Re-runs the tests on every change:

```bash
npm run dev
```

### Build Examples

```bash
npm run build
```

### Lint Code

```bash
npm run lint
```

## Writing New Examples

1. Add the example as a file in `src/`
2. Use minimal required configuration
3. Add corresponding test in `src/__tests__`
4. Ensure imports are from correct packages
5. Run test, build, and lint before committing

## Example Template

```typescript
// Minimal configuration only
import { startFlow } from '@walkeros/collector';

export async function setupExample() {
  const { collector, elb } = await startFlow({
    // Only required parameters
  });

  return { collector, elb };
}
```
