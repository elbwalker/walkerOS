---
'@walkeros/core': major
'@walkeros/collector': major
'@walkeros/web-destination-gtag': major
'@walkeros/web-destination-api': major
'@walkeros/web-destination-meta': major
'@walkeros/web-destination-plausible': major
'@walkeros/web-destination-piwikpro': major
'@walkeros/server-destination-aws': major
'@walkeros/server-destination-gcp': major
'@walkeros/server-destination-meta': major
'@walkeros/server-destination-datamanager': major
'@walkeros/web-source-browser': major
'@walkeros/web-source-datalayer': major
'@walkeros/server-source-express': major
'@walkeros/server-source-gcp': major
---

**BREAKING CHANGE**: Externalize Zod schemas for 90% bundle size reduction

Schemas are now exported from a separate `/schemas` subpath to dramatically
reduce runtime bundle sizes. This prevents Zod validation library (~270KB) from
being bundled in production code where it's not used.

## Migration Required

**Before**:

```typescript
import { schemas } from '@walkeros/web-destination-gtag';
import { zodToSchema } from '@walkeros/core';
```

**After**:

```typescript
import { schemas } from '@walkeros/web-destination-gtag/schemas';
import { zodToSchema } from '@walkeros/core/schemas';
```

## Impact

- **Server bundles**: 502KB → 50-80KB (84-90% reduction)
- **Browser bundles**: Similar massive reduction
- **Runtime imports**: No change (backward compatible)
- **Schema imports**: Breaking change (require `/schemas` subpath)

## Benefits

- ✅ 90% smaller CLI-generated bundles
- ✅ Faster cold starts in serverless/Docker
- ✅ Lower memory footprint
- ✅ Schemas still available for documentation and tooling
- ✅ Optional runtime validation remains possible

## Migration Script

```bash
# Find affected files
find . -type f \( -name "*.ts" -o -name "*.tsx" \) \
  -exec grep -l "import.*schemas.*from '@walkeros" {} \;

# Auto-fix (review changes before committing!)
find . -type f \( -name "*.ts" -o -name "*.tsx" \) \
  -exec sed -i "s|from '@walkeros/\([^']*\)'|from '@walkeros/\1/schemas'|g" {} \;
```

See documentation for detailed migration guide and architectural details.
