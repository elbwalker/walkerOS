# TypeScript Config for walkerOS

Internal TypeScript configuration package for walkerOS monorepo. Provides
standardized TypeScript compiler settings for web, Node.js, and base
configurations.

## Usage

```json
// tsconfig.json
{
  "extends": "@walkerOS/tsconfig/base.json",
  "compilerOptions": {
    // Additional project-specific options
  }
}
```

Available configs: `base.json`, `web.json`, `node.json`
