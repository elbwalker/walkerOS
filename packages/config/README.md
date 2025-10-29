# @walkeros/config

Unified development configuration package for walkerOS projects. This package
provides shared configurations for TypeScript, ESLint, Jest, and tsup build
tooling.

## Installation

```bash
npm install --save-dev @walkeros/config
```

## Usage

### TypeScript Configuration

Extend from one of the provided TypeScript configurations in your
`tsconfig.json`:

```json
{
  "extends": "@walkeros/config/tsconfig/base.json",
  "compilerOptions": {
    "rootDir": "src"
  },
  "include": ["src/**/*"]
}
```

**Available configs:**

- `@walkeros/config/tsconfig/base.json` - Base configuration for all projects
- `@walkeros/config/tsconfig/web.json` - Browser/web projects (extends base)
- `@walkeros/config/tsconfig/node.json` - Node.js projects (extends base)

### ESLint Configuration

Import the configuration in your `eslint.config.mjs`:

```javascript
import baseConfig from '@walkeros/config/eslint';

export default [
  ...baseConfig,
  {
    // Your custom rules
  },
];
```

**Available configs:**

- `@walkeros/config/eslint` - Base configuration with TypeScript and Jest
  support
- `@walkeros/config/eslint/web` - Web projects with browser globals
- `@walkeros/config/eslint/node` - Node.js projects with Node.js rules

### Jest Configuration

Use the shared Jest configuration in your `jest.config.mjs`:

```javascript
import baseConfig from '@walkeros/config/jest/web.config';

export default {
  ...baseConfig,
  // Your custom configuration
};
```

**Available configs:**

- `@walkeros/config/jest` - Base Jest configuration with SWC transform
- `@walkeros/config/jest/web.config` - Web projects with jsdom environment
- `@walkeros/config/jest/node.config` - Node.js projects
- `@walkeros/config/jest/web.setup` - Web test setup file
- `@walkeros/config/jest/node.setup` - Node.js test setup file

### tsup Configuration

Use the shared build helpers in your `tsup.config.ts`:

```typescript
import { defineConfig, buildModules } from '@walkeros/config/tsup';

export default defineConfig([buildModules()]);
```

**Available helpers:**

- `defineConfig` - TypeScript-friendly config wrapper
- `buildModules()` - Build CJS and ESM modules with type declarations
- `buildExamples()` - Build example files
- `buildBrowser()` - Build browser IIFE bundles
- `buildES5()` - Build ES5-compatible bundles

## Features

- **TypeScript**: Strict type checking with modern ECMAScript targets
- **ESLint**: TypeScript, React, and Jest linting with sensible defaults
- **Jest**: Fast testing with SWC transforms and jsdom support
- **tsup**: Simple, fast bundling with multiple output formats

## Migration from Separate Packages

If you were previously using the separate config packages (`@walkeros/tsconfig`,
`@walkeros/eslint`, `@walkeros/jest`, `@walkeros/tsup`), update your imports:

**Before:**

```json
// package.json
"devDependencies": {
  "@walkeros/eslint": "*",
  "@walkeros/jest": "*",
  "@walkeros/tsconfig": "*",
  "@walkeros/tsup": "*"
}
```

```typescript
// Config files
import from '@walkeros/eslint/index.mjs';
import from '@walkeros/jest/web.config.mjs';
import from '@walkeros/tsup';
{ "extends": "@walkeros/tsconfig/base.json" }
```

**After:**

```json
// package.json
"devDependencies": {
  "@walkeros/config": "^0.1.0"
}
```

```typescript
// Config files
import from '@walkeros/config/eslint';
import from '@walkeros/config/jest/web.config';
import from '@walkeros/config/tsup';
{ "extends": "@walkeros/config/tsconfig/base.json" }
```

## License

MIT

## Contributing

Issues and pull requests are welcome at
[github.com/elbwalker/walkerOS](https://github.com/elbwalker/walkerOS).
