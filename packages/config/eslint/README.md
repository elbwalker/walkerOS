# ESLint Config for walkerOS

Internal ESLint configuration package for walkerOS monorepo. Provides
standardized linting rules for TypeScript, JavaScript, React, and Node.js
projects.

## Usage

```javascript
// eslint.config.mjs
import { base, web, node } from '@walkerOS/eslint';

export default [
  ...base, // Base TypeScript rules
  ...web, // Web/React specific rules
  ...node, // Node.js specific rules
];
```
