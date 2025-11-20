---
'@walkeros/cli': patch
'@walkeros/docker': patch
---

Optimize web-serve bundle: enable minification and fix file extension

**Changes:**

1. **Enable minification** for production web bundle
   - Updated `packages/cli/examples/web-serve.json`: `minify: false` →
     `minify: true`
   - Reduces bundle size by 60%: 925KB → 366KB
   - Improves load time and parsing performance

2. **Fix file extension** from `.mjs` to `.js`
   - Changed output: `web-serve.mjs` → `web-serve.js`
   - IIFE format should use `.js` extension, not `.mjs` (ESM)
   - Semantically correct: file contains `var walkerOS = (() => {...})()`, not
     ES modules

3. **Update all references** to new filename
   - Docker Dockerfile COPY path
   - Docker serve.ts default file path
   - Documentation files (README, demos, build docs)

**Impact:**

- Bundle size: 925KB → 366KB (60% reduction)
- Format: Still IIFE with global `walkerOS` variable
- Backward compatible: Same functionality, just optimized
- Production-ready: Minified for deployment

**Before:**

```bash
-rw-r--r-- 925K web-serve.mjs  # unminified, wrong extension
```

**After:**

```bash
-rw-r--r-- 366K web-serve.js   # minified, correct extension
```
