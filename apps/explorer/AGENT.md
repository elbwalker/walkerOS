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
   - `Box`, `Button`, `ButtonGroup`, `Grid`, `Header`, `Icon` (`icons/`)
   - Code: `Code`, `CodeStatic`, `CodeDiff`; `PreviewFooter`

2. **Molecules** (`src/components/molecules/`): Component combinations
   - Code: `code-box.tsx` (Monaco editor with formatting controls),
     `code-diff-box.tsx`, `code-snippet.tsx`, `code-view.tsx`
   - Docs blocks: `preview`, `property-table`, `step-example`
   - Visualization: `flow-map/`, `architecture-flow/`

3. **Organisms** (`src/components/organisms/`): Complex integrated components
   - `live-code.tsx` - Generic live code execution (input/config/output panels)
   - `browser-box.tsx` - Multi-tab editor (HTML/CSS/JS) with live preview

4. **Demos** (`src/components/demos/`): Ready-to-use complete demos
   - `PromotionPlayground.tsx` - Promotion event playground

### Design components (`@walkeros/explorer/design/components`)

A second, React-only entry with the building blocks of walkerOS pages on the
design tokens; walkeros.io's home page is built from it.

- Folders follow the atomic order: `atoms/` (Button, InlineCode, EventLegend,
  Icon, InstallCommand, Card, Eyebrow, Stat, Text, TextLink), `molecules/`
  (CheckList, SectionHeading, ProblemCard, FeatureItem, FaqItem, PlanCard,
  CaseCard, HighlightCard), `layout/` (Section, CardGrid, Split, Cluster, Hero)
  and `viz/` (HeroTaggingViz, ArticleTeaserTracking, DestinationMappingViz).
  Nothing imports upward; a demo may use atoms.
- Each folder keeps its own `index.ts`; the entry `index.ts` re-exports the
  four, so names stay flat. Everything the entry reaches imports only `react`
  (`__tests__/entry.test.ts` fails otherwise), and the demo data in `viz/data/`
  imports no package either.
- Every component passes the attributes it does not own (`data-*`, `aria-*`,
  `id`) to its root element. A component with a link takes `linkComponent` (a
  router `Link`) and the link's own tagging through `CallToAction.attributes` or
  `linkAttributes`. The shared checks live in `__tests__/passThrough.tsx`, and
  each folder's `__tests__/pass-through.test.tsx` runs them.
- These components may keep their own presentation state (a copy confirmation,
  the event a demo shows); form controls elsewhere stay controlled.
- Styles: one partial per component in `src/styles/components/design/`, plus the
  demos' shared `_viz-*` parts; see STYLE.md "Design component styles".
- Demos are dark islands (`data-theme="dark"` on their root). The server render
  equals the first client frame. The hero and teaser demos animate only while
  visible and show a still frame with reduced motion; the mapping demo changes
  only on a click.
- A fidelity test holds what each demo shows to what walkerOS does: the hero and
  teaser markup runs through the real browser source and collector, the mapping
  demo's rules through the real destinations
  (`website/scripts/landing-mapping.test.mjs`). When one fails, the demo data is
  wrong: fix the data, never the test.
- Stories sit next to their component, titled `Design/<Folder>/<Name>`.

### State Management

Product components are controlled: props down, events up (SKILL.md "Controlled
Components Only"). The few shared pieces of state:

- `src/hooks/useMonacoHeight.ts`: sizes a Monaco editor to its content.
- `src/contexts/GridHeightContext.tsx`: lets a `Grid` sync the heights of its
  `Box` children (`useGridHeight`, `useBoxId`).

### Utilities

- `src/utils/` is mostly Monaco support for `Code` and `CodeBox`:
  - JSON schemas for the flow, contract and variables editors
    (`monaco-schema-*.ts`), registered through `monaco-json-schema.ts`.
  - IntelliSense for walkerOS references (`monaco-walkeros-*.ts`,
    `monaco-intellisense-flow-extractor.ts`, `monaco-json-path.ts`,
    `monaco-chain-ref-detector.ts`, `contract-path-walker.ts`,
    `mapping-context-detector.ts`, `allowed-ref-kinds.ts`).
  - TypeScript types and ambients (`monaco-types.ts`,
    `monaco-context-types.ts`), Prettier formatting (`monaco-formatters.ts`,
    `format-code.ts`), data attribute highlighting (`monaco-decorators.ts`) and
    `is-monaco-cancellation.ts`.
  - `code-normalizer.ts`: compares code ignoring comments and whitespace.
- `src/themes/`: the Monaco themes (`palenight` dark, `lighthouse` light),
  switched by `data-theme`.
- `src/lib/utils.ts`: `cn()` merges Tailwind class names.
- `src/helpers/destinations.ts`: demo destinations, see "Integration with
  walkerOS".

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
- Light: `elbTheme-light` (Lighthouse, `src/themes/lighthouse.ts`)
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
- `.storybook/main.ts` - Storybook config (component stories and the design
  stories)
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
- [ ] Reuses existing components (Box, Button, CodeBox, etc.)
- [ ] Content components have no root padding (follows Pane Standards)
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

**Recognized reference prefixes (CodeBox IntelliSense):**

- `$var.<name>(.<path>)?`: flow/source/destination/transformer variables.
  Whole-string references preserve native type (objects, arrays, scalars);
  inline interpolation requires scalars; deep paths walk into structural values.
- `$secret.<NAME>`: secret references; values never enter the editor.
- `$env.<NAME>(:default)?`: process env vars at bundle time.
- `$store.<id>`: store instance references.
- `$contract.<name>(.<path>)?`: contract value references.
- `$flow.<flowName>(.<path>)?`: cross-flow references; resolves to the named
  sibling flow's `Flow.Config` block.

The first segment is enumerable from the parsed flow document for `$store`,
`$contract`, and `$flow`. Right-hand paths after `$flow.<flowName>` rely on the
JSON-schema-driven hover from `monaco-schema-flow-config.ts`.

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
