# AGENT.md — @walkeros/explorer

Development guide for the explorer component library within the walkerOS
monorepo.

## Project Overview

**@walkeros/explorer** is a React component library for walkerOS documentation
and exploration. It provides interactive demos and editors with Monaco Editor
integration for live code editing, event visualization, and mapping
configuration.

## Code Standards

### Import Statements

- **ALWAYS import modules at the top of files** - Never use inline
  `typeof import()` or dynamic `await import()`
- **Exception — `monaco-editor`**: Never import `monaco-editor` at runtime
  (top-level or `require()`). Monaco accesses `window` at module evaluation
  time, which crashes SSR. Instead:
  - Use `useMonaco()` hook from `@monaco-editor/react` in components (returns
    `null` during SSR, the CDN-loaded instance after load)
  - For utility modules, accept the monaco instance as a parameter (see
    `initMonacoJson()` in `monaco-json-schema.ts`)
  - `import type` from `monaco-editor` is always safe (erased at compile time)
  - `@monaco-editor/react` imports are always safe (SSR-aware internally)
- Use proper type imports: `import type { Monaco } from '@monaco-editor/react';`

## Development Commands

### Essential Commands

```bash
npm test           # Run Jest tests
npm run dev        # Run tests in watch mode
npm run build      # Build package (tsup for JS/TS, SCSS compilation for styles)
npm run lint       # Type check with tsc and lint with ESLint
npm run storybook  # Start Storybook (port 6007)
npm run clean      # Clean build artifacts and dependencies
```

### Testing

- **Run all tests**: `npm test`
- **Watch mode**: `npm run dev`
- **Test files**: Located in `src/__tests__/` and `src/**/__tests__/`
- Test setup uses `@testing-library/react` with custom mocks for Monaco Editor

**CRITICAL: Test Integrity Rules**

- **NEVER create fake/mock tests that pretend to validate real functionality**
- **NEVER use simple string checks to simulate complex behavior** (e.g.,
  checking if a string contains "WalkerOS" to simulate TypeScript type checking)
- **NEVER gaslight the user by making tests pass through deception**
- **If real integration testing is difficult or impossible, EXPLICITLY state
  this limitation to the user**
- **Be honest about what tests actually verify vs what they appear to verify**
- **When faced with complex integration testing (Monaco, browser APIs, etc.),
  ask the user how to proceed rather than faking it**
- **If something isn't working and you don't know why, SAY SO IMMEDIATELY - do
  not keep trying random solutions**
- **Do not claim success based on passing tests unless those tests actually
  validate the user's requirements**
- **String manipulation tests (contains, regex) are NOT integration tests - they
  only verify string content**

Tests must reflect reality. A passing test should mean the feature actually
works, not that we fooled ourselves.

## When You Don't Know

**If you're stuck or something doesn't work:**

1. **Admit it immediately** - "I don't know why this isn't working"
2. **Show what you've tried** - Be transparent about the attempts
3. **Ask for help** - "Can you check X in the browser console?" or "Should we
   try a different approach?"
4. **Do NOT keep iterating on solutions** without user feedback
5. **Do NOT claim progress** when the actual requirement still fails

It is ALWAYS better to say "I don't know" than to waste the user's time with
false solutions.

### Building

Build creates:

- `dist/index.js` (CJS) and `dist/index.mjs` (ESM) - main module
- `dist/index.d.ts` - TypeScript declarations
- `dist/styles.css` - compiled SCSS styles

The build is configured in `tsup.config.ts` with SCSS compilation via Sass.

### Bundling Dependencies

**Important**: When adding new dependencies that should be bundled into explorer
(not resolved from consumer's node_modules), add them to the `noExternal` array
in `tsup.config.ts`.

Currently bundled:

- `clsx` - Class name utility
- `tailwind-merge` - Tailwind class merging
- `@iconify/react` - Icon component library

**Why bundle these?** Explorer is used via symlink in the walkerOS monorepo. If
a dependency is externalized (the default), it must exist in the consumer's
node_modules. Bundling ensures explorer works without requiring consumers to
install these dependencies.

**When to bundle vs externalize:**

- **Bundle** (`noExternal`): Small utilities, UI libraries that are
  implementation details
- **Externalize** (`external`): Large dependencies consumers likely have (React,
  Monaco), peer dependencies, walkerOS packages

## Architecture

### Component Hierarchy (Atomic Design)

The codebase strictly follows **Atomic Design** principles:

1. **Atoms** (`src/components/atoms/`): Base UI elements
   - `Box`, `Button`, `ButtonGroup`, `Header`, `Toggle`
   - Mapping primitives: `mapping-string`, `mapping-number`, `mapping-boolean`
   - Form controls: `icon-button`, `mapping-collapsible`, `field-header`

2. **Molecules** (`src/components/molecules/`): Component combinations
   - Navigation: `mapping-tab-bar`, `mapping-tree-sidebar`, `mapping-breadcrumb`
   - Pane views: `mapping-*-pane-view` (rule, entity, consent, condition, etc.)
   - Editors: `auto-select`, `preview`, `mapping-map-field`
   - Visualization: `flow-map`

3. **Organisms** (`src/components/organisms/`): Complex integrated components
   - `live-code.tsx` - Generic live code execution (input/config/output panels)
   - `code-box.tsx` - Monaco editor with formatting controls
   - `browser-box.tsx` - Multi-tab editor (HTML/CSS/JS) with live preview
   - `collector-box.tsx` - Collector processing display
   - `config-editor/` - Advanced configuration editor system

4. **Demos** (`src/components/demos/`): Ready-to-use complete demos
   - `MappingDemo.tsx` - Three-panel transformation editor
   - `PromotionPlayground.tsx` - Promotion event playground
   - `MappingCode.tsx` - Code-based mapping demo

### RJSF Architecture (Critical Pattern)

The project uses **React JSON Schema Form (RJSF)** with a **mandatory
Field/Widget separation pattern**:

**Field Layer** (src/components/atoms/\*-field.tsx):

- Converts RJSF `FieldProps` → `WidgetProps`
- Pass-through only (id, value, onChange, schema, uiSchema, rawErrors, disabled,
  readonly)
- ~20 lines, no UI logic
- Examples: `mapping-consent-field.tsx`, `mapping-condition-field.tsx`

**Widget Layer** (src/components/atoms/\*.tsx):

- Full UI implementation using standard building blocks
- State management (expand/collapse, previous values, show/hide)
- Form change handling and cleanup
- External value sync via `useEffect`
- Uses shared components: `MappingCollapsible`, `MappingFormWrapper`,
  `IconButton`
- Examples: `mapping-consent.tsx`, `mapping-condition.tsx`

**Field/Widget Registry**:

- `src/components/forms/field-registry.ts` - Maps field types to Field
  components
- `src/components/forms/widget-registry.ts` - Maps widget types to Widget
  components

**Common Patterns**:

- `MappingCollapsible` - Toggle/checkbox UI wrapper
- `MappingFormWrapper` - Nested form container with RJSF integration
- `IconButton` - Action buttons (add, delete, toggle)
- `cleanFormData()` - Remove empty/undefined values before onChange

### State Management

**Hooks** (`src/hooks/`):

- `useMappingState.ts` - Core mapping configuration state management
- `useMappingNavigation.ts` - Navigation state (current path, breadcrumbs, tree
  expansion)
- `useTreeState.ts` - Tree sidebar expand/collapse state
- `useMonacoHeight.ts` - Dynamic Monaco editor height calculation

**Data Flow**:

- Props down, events up (standard React unidirectional flow)
- Controlled components throughout
- State deduplication via `useEffect` with deep equality checks
- Schema passing via `ui:options` in RJSF components

### Utilities

**Key utilities** (`src/utils/`):

- `clean-form-data.ts` - Remove empty values from form data before submission
- `mapping-path.ts` - Path manipulation for nested mapping structures
- `consent-scanner.ts` - Scan and detect consent configuration
- `type-detector.ts` - **Single source of truth** for node type detection
- `value-display-formatter.ts` - Format values for display
- `code-normalizer.ts` - Normalize code strings (whitespace, indentation)
- `generic-tree-builder.ts` - Build tree structures from flat data
- `config-validator.ts` - Validate configuration objects
- `schema-validation.ts` - JSON schema validation helpers

**Schemas** (`src/schemas/`):

- `config-structures/` - Configuration object structures (destination, mapping
  rule)
- `mapping-rule-schema.ts` - Mapping rule JSON schema
- `value-config-schema.ts` - Value configuration schema

### Navigation Architecture (CRITICAL)

**Single Source of Truth**: ALL navigation MUST use `detectNodeType()` from
`src/utils/type-detector.ts`

**Two Complementary Systems**:

1. **Structure Definitions** (`ConfigStructureDef`) - Navigation metadata
   - Which pane to open for each property
   - Tree children strategy (entity-action, schema-driven, none)
   - Human-readable titles and descriptions
   - Location: `src/schemas/config-structures/`

2. **JSON Schemas** (`RJSFSchema`) - Validation and forms
   - Value validation rules (types, patterns, enums)
   - Form generation (RJSF uses these)
   - Type inference for primitives (enum, boolean, string, number)

**Detection Priority** (implemented in `detectNodeType`):

```typescript
1. Structure definition (explicit nodeType property)
2. Schema detection (enum, boolean, primitives from JSON Schema)
3. Value introspection (fallback for complex types)
```

**Mandatory Rules**:

- NEVER hardcode nodeType based on path patterns
- NEVER hardcode nodeType based on path length
- NEVER hardcode nodeType based on property names
- ALWAYS call `detectNodeType(value, path, structure, schemas)`
- Navigation hooks MUST receive `config`, `structure`, and `schemas` parameters

**Examples**:

```typescript
// ❌ WRONG - Hardcoded logic
const nodeType = path.length === 2 ? 'rule' : 'valueConfig';

// ❌ WRONG - Property name pattern matching
const nodeType = path[0] === 'consent' ? 'consent' : 'valueConfig';

// ✅ CORRECT - Use detectNodeType
const value = getValueAtPath(config, path);
const nodeType = detectNodeType(value, path, structure, schemas);
```

## Styling Architecture (CRITICAL)

**Complete styling documentation:** [STYLE.md](./STYLE.md)

### Quick Reference

**Theme Support (Required)**:

```html
<html data-theme="dark">
  ...
</html>
```

**Monaco Editor Themes**:

- Dark: `elbTheme-dark` (Prism Palenight)
- Light: `elbTheme-light` (GitHub)
- Automatically sync with `data-theme` attribute

**SCSS Rules (MANDATORY):**

**✅ DO:**

- Use ONLY defined CSS variables from `theme/_variables.scss`
- Follow BEM naming: `.elb-{component}-{element}--{modifier}`
- Use `calc(var(--font-size-base) - 1px)` for font size variations
- Create one SCSS file per component in correct directory
- Import new files alphabetically in `index.scss`
- Test in both light and dark themes

**❌ DON'T:**

- Use undefined CSS variables (e.g., `--bg-secondary`, `--font-size-sm`)
- Use `--font-family-mono` (correct: `--font-mono`)
- Hardcode colors, spacing, or font sizes
- Use inline `style` attributes

**See [STYLE.md](./STYLE.md) for:**

- Complete CSS Variables Reference (all variables with light/dark values)
- Grid System (height modes: equal, auto, synced - why Grid is complex)
- Monaco Editor (theming, tokens, local loading, IntelliSense, debugging)
- SCSS Architecture & Component Checklist
- Design Rules (when to add variables, color selection, accessibility)
- Common Tasks & Troubleshooting

## Important Files

- `src/index.ts` - Public API exports (add new public components here)
- `tsup.config.ts` - Build configuration (module + styles)
- `vite.config.ts` - Dev server config (serves examples/)
- `jest.config.mjs` - Test configuration
- `src/styles/index.scss` - Main stylesheet entry
- `src/styles/PANE_STANDARDS.md` - Pane layout standards

## Code Quality Standards

### Clean Refactoring Policy

When refactoring or migrating code patterns:

- **NO backward compatibility layers** - Complete the migration fully
- **NO legacy function preservation** - Delete old patterns entirely
- **NO migration comments** - Code should be self-documenting
- **NO inline comments** explaining "what changed" or "migration progress"
- **NO unnecessary additions** - When asked to update existing code, ONLY modify
  what was requested. Do not add new functions, examples, or features unless
  explicitly asked.
- Write clean, production-ready code as if the old pattern never existed

**Example**:

```typescript
// ❌ WRONG - Legacy compatibility
function navigateToPath(path: string[]) {
  // TODO: Migrate to detectNodeType
  // Legacy: const nodeType = path.length === 2 ? 'rule' : 'valueConfig';
  const nodeType = detectNodeType(...); // New pattern
}

// ✅ CORRECT - Clean implementation
function navigateToPath(path: string[]) {
  const value = getValueAtPath(config, path);
  const nodeType = detectNodeType(value, path, structure, schemas);
  openTab(path, nodeType);
}
```

**Rationale**: Migration comments and backward compatibility layers confuse
future developers and create technical debt. Complete the migration in one clean
step.

## Component Checklist

**Before submitting any component:**

- [ ] Placed in correct atomic layer (atoms/molecules/organisms/demos)
- [ ] TypeScript types exported from component file
- [ ] SCSS file created in correct directory with BEM naming
      (`elb-{component}-*`)
- [ ] SCSS imported in `index.scss` (alphabetical order)
- [ ] All CSS variables exist in `theme/_variables.scss`
- [ ] No hardcoded values (colors, spacing, fonts)
- [ ] Uses `calc(var(--font-size-base) - Npx)` for size variations
- [ ] No inline `style` attributes
- [ ] Light and dark theme tested
- [ ] Reuses existing components (MappingCollapsible, IconButton, etc.)
- [ ] RJSF components follow Field/Widget separation pattern
- [ ] Content components have no root padding (follows Pane Standards)
- [ ] Navigation uses `detectNodeType()` (no hardcoded path/length logic)
- [ ] Build succeeds: `npm run build`
- [ ] Exported from `src/index.ts` if public API

## Storybook Story Guidelines

- **Prefer Storybook controls over separate stories** for trivial prop
  variations (e.g., `disabled: true`, `size: 'lg'`). Users can toggle these in
  the controls panel.
- **Use composite stories** to showcase multiple variants side-by-side when
  visual comparison matters (e.g., ThemeComparison, MarkersWithLegend).
- **One story per distinct feature** — each story should demonstrate a unique
  component capability, not a minor prop tweak.
- **No design exploration galleries** — layout/typography comparison stories
  belong in design tools, not Storybook.
- **No website/CI-specific stories** — stories should demo generic component
  features, not site-specific styling or marketing use cases.

## Integration with walkerOS

This library depends on `@walkeros/core`, `@walkeros/collector`, and
`@walkeros/web-source-browser`. It provides interactive documentation and
testing components for the walkerOS ecosystem.

**Destination helpers** (`src/helpers/destinations.ts`):

- `createGtagDestination()` - Google Analytics 4
- `createFbqDestination()` - Facebook Pixel
- `createPlausibleDestination()` - Plausible Analytics

### Monaco ambient globals (CodeBox IntelliSense)

Mapping and flow snippets embedded in docs run inside Monaco and can use the
walkerOS runtime globals (`elb`, `getMappingEvent`, `getMappingValue`) without
any `import` statement. The globals are declared in an ambient `.d.ts`
registered via Monaco's official `addExtraLib` API.

- Declarations live in `src/utils/monaco-types.ts` →
  `registerWalkerOSAmbients(monaco)`.
- Base compiler options (`target: ES2022`, `module: ESNext`,
  `moduleDetection: 'force'`) are applied by `configureMonacoTypeScript`.
- Both functions run unconditionally on every Monaco mount from `atoms/code.tsx`
  (`handleBeforeMount`). They are idempotent.

**Adding a new runtime global:**

1. Add the declaration inside the `declare global { ... }` block in
   `registerWalkerOSAmbients`.
2. Type it via imports from `@walkeros/core` (the ambient file imports types,
   then re-declares values/functions as globals).
3. Keep the `export {}` footer — it's what turns the file into a module so
   `declare global` augments global scope correctly.

**Rule:** only declare things that are genuinely available at snippet runtime.
The ambient block is for runtime globals, not a workaround for missing imports
in user-authored code.
