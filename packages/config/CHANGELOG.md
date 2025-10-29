# @walkeros/config

## 0.1.0

### Major Changes

- **Unified Configuration Package**: Consolidated four separate configuration
  packages (`@walkeros/tsconfig`, `@walkeros/eslint`, `@walkeros/jest`,
  `@walkeros/tsup`) into a single unified package.

  **Migration Required**: Update your imports and dependencies:

  **Before:**

  ```json
  {
    "devDependencies": {
      "@walkeros/eslint": "*",
      "@walkeros/jest": "*",
      "@walkeros/tsconfig": "*",
      "@walkeros/tsup": "*"
    }
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
  {
    "devDependencies": {
      "@walkeros/config": "^0.1.0"
    }
  }
  ```

  ```typescript
  // Config files
  import from '@walkeros/config/eslint';
  import from '@walkeros/config/jest/web.config';
  import from '@walkeros/config/tsup';
  { "extends": "@walkeros/config/tsconfig/base.json" }
  ```

### Benefits

- **Simplified dependencies**: Single package instead of four
- **Unified versioning**: All configs updated atomically
- **Better discoverability**: One package to find and install
- **Reduced maintenance**: Single package to update and publish
- **External usage**: Can now be used outside the monorepo

### Included Configurations

- **TypeScript** (`tsconfig/*`): base.json, web.json, node.json
- **ESLint** (`eslint/*`): index.mjs, web.mjs, node.mjs
- **Jest** (`jest/*`): index.mjs, web.config.mjs, node.config.mjs, setup files
- **tsup** (`tsup/*`): Build configuration helpers
