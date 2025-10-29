# Storybook 10 Migration Plan

## Status: Pending

**Reason:** Currently supporting Storybook 9 for existing customer. Migration to
v10 will be part of v1.0.0 release.

## Issue Reference

- GitHub Issue: https://github.com/elbwalker/walkerOS/issues/551
- Storybook 10 was officially released: Oct 29, 2024 (v10.0.1)
- Official Migration Guide:
  https://storybook.js.org/docs/10/addons/addon-migration-guide

## Breaking Change

Storybook 10 is **ESM-only** - all CJS builds must be removed.

## Required Changes

### 1. Package.json Updates

#### Update peerDependencies

```json
// Current (v0.x for Storybook 9)
"peerDependencies": {
  "storybook": "^9.0.0"
}

// Target (v1.0.0 for Storybook 10)
"peerDependencies": {
  "storybook": "^10.0.0"
}
```

#### Update exports to ESM-only

```json
// Remove dual "import"/"require" patterns
// Change from:
".": {
  "types": "./dist/index.d.ts",
  "import": "./dist/index.js",
  "require": "./dist/index.cjs"
},

// To:
".": {
  "types": "./dist/index.d.ts",
  "default": "./dist/index.js"
},

// Also update:
"./preview": {
  "types": "./dist/index.d.ts",
  "default": "./dist/preview.js"  // Remove require
},
"./preset": "./dist/preset.js",  // Change from .cjs to .js
"./manager": "./dist/manager.js"
```

### 2. tsup.config.ts Changes

**File:** `apps/storybook-addon/tsup.config.ts`

#### Update Node target

```typescript
// Line 8: Update minimum Node version
const NODE_TARGET: Options['target'] = 'node20.19'; // Was: 'node20'
```

#### Change all formats to ESM-only

```typescript
// Line 64: Export entries
format: ['esm'],  // Was: ['esm', 'cjs']

// Line 94: Preview entries
format: ['esm'],  // Was: ['esm', 'cjs']

// Line 107: Node entries
format: ['esm'],  // Was: ['cjs']
```

#### Update browser targets and remove global packages

```typescript
// Manager entries (around line 75-81)
configs.push({
  ...commonConfig,
  entry: managerEntries,
  format: ['esm'],
  platform: 'browser',
  target: 'esnext', // ADD THIS
  external: ['react', 'react/jsx-runtime'], // REMOVE globalManagerPackages
});

// Preview entries (around line 88-97)
configs.push({
  ...commonConfig,
  entry: previewEntries,
  dts: { resolve: true },
  format: ['esm'],
  platform: 'browser',
  target: 'esnext', // ADD THIS
  external: [], // REMOVE globalPreviewPackages
});

// Export entries (around line 58-68)
configs.push({
  ...commonConfig,
  entry: exportEntries,
  dts: { resolve: true },
  format: ['esm'],
  platform: 'neutral',
  target: NODE_TARGET,
  external: [], // REMOVE globalManagerPackages and globalPreviewPackages
});
```

**Reason:** Storybook 10 bundles addon entries again, so global packages no
longer need to be externalized.

#### Optional: Remove imports (now unnecessary)

```typescript
// Lines 5-6: Can be removed if not using these anymore
// import { globalPackages as globalManagerPackages } from 'storybook/internal/manager/globals';
// import { globalPackages as globalPreviewPackages } from 'storybook/internal/preview/globals';
```

### 3. Preset File Updates (if applicable)

If using local presets (`.storybook/main.cjs`), convert to ESM:

```javascript
// Before (CJS):
module.exports = {
  addons: [require.resolve('./preset.cjs')],
};

// After (ESM):
export default {
  addons: [import.meta.resolve('./preset.js')],
};
```

### 4. Build Verification

After changes, verify:

```bash
npm run build
ls -la dist/  # Should only see .js files, no .cjs files
```

Ensure no CJS outputs:

- ❌ `index.cjs`
- ❌ `preview.cjs`
- ❌ `preset.cjs`
- ✅ `index.js`
- ✅ `preview.js`
- ✅ `preset.js`

### 5. Testing

Test with Storybook 10:

```bash
# Install Storybook 10
npm install --save-dev storybook@^10.0.0

# Test in development
npm run storybook

# Test build
npm run build-storybook
```

## Version Strategy

### Current: v0.x (Storybook 9 Support)

- **Latest:** v0.2.2 (includes jest.fn() production fix)
- **Supports:** Storybook ^9.0.0
- **Status:** Maintenance mode - security fixes only

### Future: v1.0.0 (Storybook 10 Support)

- **Target Release:** When customer migrates to Storybook 10
- **Supports:** Storybook ^10.0.0 only
- **Breaking Changes:**
  - ESM-only (no CJS)
  - Drops Storybook 9 support
  - Minimum Node.js 20.19

## Migration Path for Users

**Storybook 9 Users:**

```json
{
  "storybook": "^9.1.2",
  "@walkeros/storybook-addon": "^0.2.2"
}
```

**Storybook 10 Users (after v1.0.0 release):**

```json
{
  "storybook": "^10.0.0",
  "@walkeros/storybook-addon": "^1.0.0"
}
```

## Checklist for v1.0.0 Release

- [ ] Update package.json peerDependencies to `"storybook": "^10.0.0"`
- [ ] Update package.json exports to remove CJS
- [ ] Update tsup.config.ts to ESM-only
- [ ] Update Node target to 20.19
- [ ] Remove globalPackages from externals
- [ ] Add `target: 'esnext'` for browser entries
- [ ] Convert any CJS presets to ESM
- [ ] Build and verify no .cjs outputs
- [ ] Test with Storybook 10.0+
- [ ] Update README with version compatibility matrix
- [ ] Update CHANGELOG
- [ ] Create migration guide for users
- [ ] Tag release as v1.0.0

## References

- [Storybook 10 Migration Guide](https://storybook.js.org/docs/10/releases/migration-guide)
- [Addon Migration Guide for Storybook 10](https://storybook.js.org/docs/10/addons/addon-migration-guide)
- [Storybook Addon Kit](https://github.com/storybookjs/addon-kit)
- GitHub Issue #551

## Notes

- The jest.fn() production bug fix (completed) is unrelated to this migration
- Storybook recommends releasing a new major version rather than maintaining
  dual support
- Community addons (e.g., storybook-addon-pseudo-states) have already adopted
  this approach
