# Jest Config for walkerOS

Internal Jest configuration package for walkerOS monorepo. Provides standardized
testing configurations for web and Node.js environments.

## Usage

```javascript
// jest.config.mjs
import { webConfig, nodeConfig } from '@walkeros/jest';

export default webConfig; // or nodeConfig for server packages
```
