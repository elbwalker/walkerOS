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
├── collector/           # Event collection examples
├── web-browser/        # Browser tracking examples
├── web-destinations/   # Web destination integrations
├── server-destinations/# Server-side integrations
└── walkerjs/          # Bundle examples
```

## Usage

### Running Tests

```bash
npm run test
```

### Development Mode

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

1. Create example in appropriate directory
2. Use minimal required configuration
3. Add corresponding test in `__tests__`
4. Ensure imports are from correct packages
5. Run test, build, and lint before committing

## Example Template

```typescript
// Minimal configuration only
import { startFlow } from '@walkeros/collector';

const collector = startFlow({
  // Only required parameters
});

export { collector };
```
