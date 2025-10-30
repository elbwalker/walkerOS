# @walkeros/core

## Unreleased

### Breaking Changes

#### Schema Organization Restructure

**What changed:**

- Complete reorganization of `packages/core/src/schemas/` to mirror
  `packages/core/src/types/` structure
- Schemas previously in `value-config.ts` have been moved to `mapping.ts`
- New schema files added: `walkeros.ts`, `destination.ts`, `collector.ts`,
  `source.ts`, `utilities.ts`
- `value-config.ts` is now **deprecated** and will be removed in the next major
  version

**Impact on imports:**

```typescript
// ✅ Still works (re-exported from index.ts)
import { ValueConfigSchema, LoopSchema } from '@walkeros/core';

// ✅ Also works (explicit import from new location)
import { ValueConfigSchema, LoopSchema } from '@walkeros/core/schemas/mapping';

// ❌ Will stop working in next major version
import { ValueConfigSchema } from '@walkeros/core/schemas/value-config';
```

**Action required:**

- If importing from `@walkeros/core` → **No action needed** (backwards
  compatible)
- If importing directly from `schemas/value-config.ts` → Update to import from
  `schemas/mapping.ts`

**New schemas added:**

- **Core Event Model** (`walkeros.ts`): EventSchema, UserSchema,
  PropertiesSchema, EntitySchema, ConsentSchema, SourceTypeSchema
- **Mapping System** (`mapping.ts`): ValueSchema, RuleSchema, RulesSchema,
  PolicySchema, ConfigSchema (migrated from value-config.ts)
- **Destination** (`destination.ts`): ConfigSchema, InstanceSchema, BatchSchema,
  ResultSchema
- **Collector** (`collector.ts`): ConfigSchema, SessionDataSchema,
  CommandTypeSchema, InstanceSchema
- **Source** (`source.ts`): BaseEnvSchema, ConfigSchema, InstanceSchema,
  InitSourceSchema
- **Utilities** (`utilities.ts`): StorageTypeSchema, ErrorHandlerSchema,
  LogHandlerSchema

**DRY Improvements** (`primitives.ts` & `patterns.ts`):

- **New files**: Reusable schema building blocks to eliminate duplication
- **Primitives**: OptionalString, OptionalBoolean, Identifier, Timestamp,
  Counter, TaggingVersion, GenericSettings, GenericEnv, etc.
- **Standard descriptions**: DESCRIPTIONS map ensures consistent field
  descriptions across all schemas
- **Helper functions**: createIdSchema(), createBooleanSchema(),
  createTimestampSchema(), etc.
- **Patterns**: HandlersConfig, VerboseConfig, QueueConfig, and other common
  configuration patterns
- **Impact**: Eliminated 70+ schema duplications, ~100-150 lines of code
  reduction

**Critical fixes:**

- **Tagging description standardized**: "Tagging version number" now consistent
  in VersionSchema and Collector.ConfigSchema
- **Handler functions**: ErrorHandlerSchema and LogHandlerSchema now imported
  from utilities.ts (not redefined inline)
- **ID fields**: Standardized with context-aware descriptions (userId,
  sessionId, deviceId, sourceId, destinationId, eventId)
- **Primitive fields**: Boolean/String/Number inline definitions replaced with
  reusable primitives

**Files updated with DRY patterns:**

- `walkeros.ts`: User, Version, Source, Event schemas use primitives
- `collector.ts`: Config, SessionData schemas use primitives and fix tagging
- `destination.ts`: Config schema uses primitives and handler patterns
- `source.ts`: Config schema uses primitives and handler patterns
- `index.ts`: Exports primitives and patterns for external use

**Benefits:**

- Clear organization mirroring types folder structure
- Comprehensive Zod schemas for runtime validation
- JSON Schema generation for MCP tools and Explorer UI
- Consistent naming convention: `{TypeName}Schema` and `{typeName}JsonSchema`
- DRY principle: Single source of truth for common schema patterns
- Standardized descriptions across all schemas

**Documentation:**

- See `packages/core/src/schemas/README.md` for complete schema documentation
- See `packages/core/src/schemas/primitives.ts` for reusable primitives
- See `packages/core/src/schemas/patterns.ts` for common patterns
- All schemas include detailed descriptions via `.describe()`
- JSON Schema exports available for all major types

**Migration timeline:**

- Current version: Backwards compatible, all old imports work
- Next major version: `value-config.ts` will be removed

## 0.2.1

### Patch Changes

- Schema builder, event-level mapping policies, config package, fixed jest mocks

## 0.2.0

### Minor Changes

- env

## 0.1.2

### Patch Changes

- a0ced16: env

## 0.1.1

### Patch Changes

- flow

## 0.1.0

### Minor Changes

- fixes

## 0.0.8

### Patch Changes

- af0ea64: init fixes
