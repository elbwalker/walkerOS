# Explorer Styling Guide

Styling explorer's components on the walkerOS design system.

**Quick Links:** [Quick Start](#quick-start) · [Design Tokens](#design-tokens) ·
[Grid System](#grid-system) · [Monaco Editor](#monaco-editor) ·
[SCSS Architecture](#scss-architecture)

---

## Quick Start

### Required Imports

```tsx
// Once per page: the design tokens (in a Tailwind v4 build,
// '@walkeros/explorer/design/tailwind.css' instead)
import '@walkeros/explorer/design/tokens.css';
// Explorer's component styles (they do not include the tokens)
import '@walkeros/explorer/styles.css';
```

### Theme

One attribute on the page root:

```html
<html data-theme="dark">
  <!-- or data-theme="light" -->
</html>
```

Dark is the default: without the attribute the tokens resolve to their dark
values. There is no system-preference fallback. Code surfaces stay dark in both
themes (see [Dark islands](#dark-islands)).

---

## Design Tokens

Explorer's components read the walkerOS design tokens from `design/tokens.json`
(SKILL.md, "Design area"). Explorer declares no variables of its own, and
`.elb-explorer` is a layout root only. To change a colour, change its token,
never a component.

### Which token for what

| Role            | Tokens                                                                                                                                        |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Text            | `--fg` (primary), `--fg-2` (secondary, labels, inactive buttons), `--fg-3` (meta, placeholder, disabled)                                      |
| Grounds         | `--bg` (page, inputs), `--bg-2` (headers, footers, button groups), `--surface` (boxes, menus), `--surface-2` (hover, inline code)             |
| Edges           | `--border` (hairlines), `--border-strong` (inputs, controls, floating layers), `--focus` (focus ring)                                         |
| Actions         | `--primary` fill with `--on-primary` text, `--link` for text in the brand colour, `--danger` with `--on-danger`                               |
| Status          | `--success`, `--warning`, `--danger`, `--info`, tints `--success-bg` and the like; always with an icon and a word                             |
| Events          | `--event-entity`, `--event-action`, `--event-property`, `--event-context`, `--event-globals`; on dark grounds only                            |
| Flow steps      | `--step-source`, `--step-transformer`, `--step-collector`, `--step-destination`, `--step-store`, `--platform-web`, `--platform-server`        |
| Code            | `--code-bg`, `--code-bar`, `--code-border`, `--code-fg`; editor colours are the `syntax-*` constants                                          |
| Product visuals | `--viz-*`                                                                                                                                     |
| Type            | `--font-sans`, `--font-mono`, `--font-viz`, `--font-viz-mono`; per style `--type-<style>-size`, `-line-height`, `-weight`, `-family`          |
| Radius          | `--radius-xs` (4px, boxes and buttons), `--radius-sm` (5px), `--radius-md` (8px), `--radius-lg` (12px), `--radius-xl` (16px), `--radius-full` |
| Layers          | `--z-raised`, `--z-sticky`, `--z-dropdown`, `--z-overlay`, `--z-modal`, `--z-popover`, `--z-toast`                                            |
| Motion          | `transition: <property> var(--motion) var(--ease)`, nothing else; reduced motion sets `--motion` to zero                                      |

Product components use the product type group: `product-body` 14px,
`product-small` 13px, `product-caption` 12px, `product-title` 16px,
`product-heading` 20px (`font-size: var(--type-product-small-size)`), and
`product-micro` 11px only for dense canvas labels (node badges, edge labels).
Every text size is a type style; a label that scales with a zoom multiplies its
style's size (`calc(var(--type-<style>-size) * <k>)`). Monaco takes its size
from the `typeCodeStep` constant, since its options cannot read a variable.

No drop shadows: a floating layer (menu, dropdown) is `var(--surface)` with a
`1px solid var(--border-strong)` edge.

### Local variables

Geometry that a component sets from JavaScript or shares between its own rules
(`--grid-min-box-width`, `--grid-row-min-height`) is declared on that
component's root, never on `.elb-explorer` and never as a stand-in for a token.

### Dark islands

Code and product visualisations stay dark in both themes. These roots carry
`data-theme="dark"`, so every token inside them resolves to its dark value:

- `Code`, `CodeDiff`, `CodeStatic`, and the boxes of `CodeBox`, `CodeView`,
  `CodeDiffBox`, `BrowserBox` and the preview (through `Box`'s `theme` prop).
- `EventLegend`, the design demos and `PhotoPlaceholder` with `tone="viz"`.

The code panels also take `.elb-explorer-box--code`, which paints the box,
header and footer in the `code-*` tokens. The preview iframe's ground is
`viz-bg`.

---

## Grid System

Explorer uses a sophisticated Grid component with three height modes for
responsive layouts. By default all boxes sit in one row that scrolls
horizontally; `columns` sets the boxes per row and wraps the rest to a new row.
Pass the number of boxes you render, since unused columns stay empty (LiveCode
passes 2 when it has no config box). Narrow containers stack the boxes.

### Height Modes

**1. Equal Heights** - All boxes in same row share the tallest content height

```tsx
<Grid columns={3} rowHeight="equal">
  <CodeBox code={event} />
  <CodeBox code={mapping} />
  <CodeBox code={output} />
</Grid>
```

**2. Auto Heights** - Each box sized independently to content

```tsx
<Grid columns={3} rowHeight="auto">
  <CodeBox code={shortEvent} />
  <CodeBox code={longMapping} />
  <CodeBox code={mediumOutput} />
</Grid>
```

**3. Synced Heights** - Boxes in same row share height, different rows can
differ

```tsx
<Grid columns={3} rowHeight="synced">
  <CodeBox code={event} />
  <CodeBox code={mapping} />
  <CodeBox code={output} />
  {/* Next row can have different height */}
  <CodeBox code={shortSnippet} />
</Grid>
```

### Implementation Details

**Why Grid Heights Are Complex:**

The Grid height synchronization required sophisticated coordination because:

1. **Monaco reports content-only height** - Excludes header (40px) and border
   (2px)
2. **Box needs total height** - Must add header + border for consistent row
   sizing
3. **Height changes cascade** - Content → Monaco → Box → Grid → Row
4. **Race conditions during mount** - Components mount asynchronously
5. **Automatic layout detection** - Must detect container resize events

**Key Files:**

- [useMonacoHeight.ts](./src/hooks/useMonacoHeight.ts) - Monaco content
  measurement
- [GridHeightContext.tsx](./src/contexts/GridHeightContext.tsx) -
  Cross-component coordination
- [box.tsx](./src/components/atoms/box.tsx) - Total height calculation
- [grid.tsx](./src/components/atoms/grid.tsx) - Row height orchestration

**Common Pitfalls:**

1. **Forgetting Box overhead** - Always add header (40px) + border (2px) to
   Monaco height
2. **Not handling async layout** - Monaco's layout() is async, use callbacks
3. **ResizeObserver loops** - Debounce layout calls with requestAnimationFrame
4. **Theme-specific heights** - Check both themes for consistency

**Usage Guidelines:**

```tsx
// Grid context - Don't use autoHeight (maintains equal row heights)
<Grid columns={2} rowHeight="synced">
  <CodeBox code={event} label="Event" />
  <CodeBox code={mapping} label="Mapping" />
</Grid>

// Standalone context - Use autoHeight to fit content
<CodeBox
  code={setupExample}
  label="Setup"
  autoHeight={{ min: 100, max: 600 }}
  disabled
/>

// Explicit height override
<CodeBox code={longCode} height="600px" />
```

**Height Calculation:**

```typescript
// Monaco provides content-only height
const contentHeight = editor.getContentHeight(); // e.g., 347px

// Box calculates total height
const totalHeight = contentHeight + 40 + 2; // 389px (includes header + border)

// Grid syncs heights across row
const rowHeight = Math.max(...boxHeightsInRow); // Use tallest box
```

---

## Monaco Editor

### The code theme

Explorer has one Monaco theme, `elbTheme-dark` (`ELB_THEME_DARK`), built in
[palenight.ts](./src/themes/palenight.ts) from the design constants: the
`syntax-*` colours for code, the `code-*` colours for the editor UI, and
`primary` for the cursor. Shiki (`CodeStatic`, which `CodeView` renders) uses
the same theme through `shiki-adapter.ts`. Code surfaces are dark in both page
themes, so nothing switches the editor theme. `Code` and `CodeDiff` call
`registerTheme(monaco)` in `beforeMount`.

### Token colours

Each role reads one design constant; every scope of the role follows it
(`TOKEN_GROUPS` in `palenight.ts` feeds Monaco and Shiki alike):

| Role                                   | Constant          |
| -------------------------------------- | ----------------- |
| Comments (italic)                      | `syntaxComment`   |
| Strings, attribute values              | `syntaxString`    |
| Numbers                                | `syntaxNumber`    |
| Keywords, CSS properties               | `syntaxKeyword`   |
| Functions, CSS ids                     | `syntaxFunction`  |
| Types and classes                      | `syntaxType`      |
| Operators, regular expressions         | `syntaxOperator`  |
| Booleans and constants                 | `syntaxConstant`  |
| Punctuation and delimiters             | `syntaxPunct`     |
| HTML tags, CSS selectors, invalid code | `syntaxTag`       |
| Namespaces                             | `syntaxNamespace` |
| Variables, URLs                        | `codeFg`          |

To change a colour, change its token in `design/tokens.json`, never the theme
file.

### Language-Specific Token Rules

**Critical**: Monaco uses specific token names per language. Always add
language-specific rules for proper highlighting:

```typescript
// One token group in palenight.ts: the generic scope alone may not match
{
  foreground: C.string,
  scopes: [
    'string',
    'string.html',
    'string.json',
    'string.js',
    'string.ts',
    'string.value.json',
  ],
},
```

**Common Language-Specific Tokens:**

```typescript
// HTML
'entity.name.tag.html'; // <div>
'attribute.name.html'; // class=""
'attribute.value.html'; // ="value"
'delimiter.html'; // < > / =
'comment.html'; // <!-- -->

// JSON
'string.key.json'; // "key":
'string.value.json'; // : "value"
'support.type.property-name.json'; // Object keys

// JavaScript/TypeScript
'variable.parameter.ts'; // Function parameters
'support.type.primitive.ts'; // string, number, etc.
'entity.name.type.ts'; // Type names
'keyword.operator.type.ts'; // : => |
```

### Local Loading (Not CDN)

**Problem:** Monaco's default behavior loads from CDN, causing CORS issues.

**Solution:** Static synchronous imports in
[code.tsx](./src/components/atoms/code.tsx):

```typescript
// Static imports for Monaco and workers
import * as monaco from 'monaco-editor';
import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import JsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';
// ... other workers

// Configure BEFORE any Editor component mounts
if (typeof window !== 'undefined') {
  self.MonacoEnvironment = {
    getWorker(_: unknown, label: string) {
      if (label === 'json') return new JsonWorker();
      // ... other worker mappings
      return new EditorWorker();
    },
  };

  loader.config({ monaco }); // Prevents CDN fallback
}
```

**Why It Works:**

- Static imports execute synchronously at module load time
- `loader.config()` runs BEFORE any `<Editor>` component mounts
- No network requests to CDN

### Monaco UI Colors

The editor UI keys derive from the `code-*` constants and `primary`, never a new
literal:

```typescript
colors: {
  'editor.background': codeBg,
  'editor.lineHighlightBackground': codeBg,
  'editorCursor.foreground': primary.dark,
  'editor.selectionBackground': codeSelection,
  // Sticky scroll MUST have a solid background
  'editorStickyScroll.background': codeBg,
  'editorStickyScroll.border': codeBorder,
}
```

### Debugging Token Colors

**Step 1: Find Token Scope**

Open Monaco Editor with F1 → "Developer: Inspect Tokens"

```
Token: "const"
Scopes:
  - keyword.const.ts
  - source.ts
```

**Step 2: Add Specific Rule**

```typescript
// Add the scope to its role's token group in palenight.ts
{
  foreground: C.keyword,
  scopes: ['keyword', 'keyword.const.ts'],
},
```

**Step 3: Verify in Browser DevTools**

Inspect rendered Monaco token span:

```html
<span class="mtk5">const</span>
```

Check computed styles for `.mtk5` - should have your foreground color.

### TypeScript IntelliSense

Monaco Editor provides IntelliSense for walkerOS packages through a virtual file
system.

**How It Works:**

```
User types code → Monaco TypeScript Service → Virtual File System
  import type { WalkerOS } from '@walkeros/core';
                                       ↓
  file:///node_modules/@walkeros/core/index.d.ts
                                       ↓
  IntelliSense: Autocomplete, type checking, hover docs
```

**Bundled Types** (included at build time):

- `@walkeros/core`
- `@walkeros/collector`
- `@walkeros/web-source-browser`

**Setup** (automatic):

The [monaco-types.ts](./src/utils/monaco-types.ts) utility:

1. Registers walkerOS type definitions with Monaco
2. Creates virtual files in Monaco's file system
3. Provides autocomplete and type checking

**Usage:**

```typescript
import { registerWalkerOSTypes } from '../../utils/monaco-types';

const handleBeforeMount = (monaco: typeof import('monaco-editor')) => {
  registerWalkerOSTypes(monaco); // Enables IntelliSense
  registerTheme(monaco);
  monaco.editor.setTheme(ELB_THEME_DARK);
};
```

### JSON IntelliSense

CodeBox supports JSON Schema-driven IntelliSense via the `jsonSchema` prop. When
provided, the editor offers autocomplete, validation, and hover documentation
for JSON content.

**How It Works:**

```
jsonSchema prop → Schema Registry → Monaco JSON Language Service
                                         ↓
                     Autocomplete, validation squiggles, hover docs
```

The [monaco-json-schema.ts](./src/utils/monaco-json-schema.ts) registry manages
schemas globally. Each Code instance with a `jsonSchema` prop gets a unique
model URI (`path`), and the registry calls `setDiagnosticsOptions` with all
active schemas whenever one is added or removed.

**Usage:**

```tsx
// Static schema (e.g., Flow.Json)
import { schemas } from '@walkeros/core/dev';

<CodeBox
  code={flowJson}
  onChange={setFlowJson}
  language="json"
  showFormat
  jsonSchema={schemas.configJsonSchema as Record<string, unknown>}
/>;
```

**What the prop enables:**

- `quickSuggestions`: auto-popup on typing (normally disabled)
- `renderValidationDecorations`: red squiggles for schema violations
- `hover`: tooltip descriptions from schema `description` fields
- Unique model `path`: auto-generated to isolate schema per editor instance

**`intellisenseContext` prop:** Provides completions, hover tooltips, and
semantic validation markers for every canonical walkerOS reference form:
`$var.name(.path)?`, `$env.NAME:default`, `$contract.name.path`, `$store.id`,
`$secret.NAME`, and `$code:payload`. The rule is simple: `.` for names and
paths, `:` for literal values (env defaults) or raw-code payloads.

Regex patterns live in `@walkeros/core` as `REF_VAR_FULL`, `REF_VAR_INLINE`,
`REF_ENV`, `REF_CONTRACT`, `REF_STORE`, `REF_SECRET`, `REF_CODE_PREFIX`: import
these when you need to match or validate references; do not hand-roll the
regexes.

Chain references (`next` / `before`) are detected via JSON-path awareness
(`detectChainRefContext`) and cover scalar, inline array, multi-line array, and
Route[] inner `next` forms. Chain markers use a recursive JSON walk instead of a
line regex.

Context completions adapt to what the caller passes: when `stores` is provided,
`$store.` fires completions; when `envNames` is provided, `$env.` gains
autocompletion and validation (absent inventory, `$env.` still gets a generic
hover).

Also generates a unique model `path` and enables `quickSuggestions` and `hover`
independently of `jsonSchema`. Both props can be combined for full schema
validation + context-driven features.

**Advanced: Direct Registry Access:**

```typescript
import {
  registerJsonSchema,
  unregisterJsonSchema,
  generateModelPath,
} from '@walkeros/explorer';

// For dynamic schemas (e.g., package-specific settings fetched from CDN)
const path = generateModelPath();
registerJsonSchema(path, fetchedSchema);
// ... later
unregisterJsonSchema(path);
```

---

## SCSS Architecture

### Directory Structure

```
src/styles/
├── index.scss              # Main entry (import all components here)
├── _config.scss
├── foundation/
│   ├── _reset.scss         # Scoped to .elb-explorer, reads design tokens
│   ├── _typography.scss
│   ├── _layout.scss        # Grid/flex mixins
│   ├── _grid.scss
│   └── _responsive.scss    # Breakpoint mixins
├── utilities/
│   └── _helpers.scss
└── components/
    ├── atoms/              # _button.scss, _code.scss, etc.
    ├── molecules/          # _code-box.scss, _flow-map.scss, etc.
    ├── organisms/          # _box.scss
    └── design/             # Design components: _atoms, _molecules, _layout, _viz aggregators and one partial each
```

### Design component styles

The partials in `components/design/` follow the design system, not the explorer
theme:

- Colours, radii, fonts and spacings come from the design tokens
  (`@walkeros/explorer/design/tokens.css`); text takes the `--type-<style>-*`
  variables, and a fluid heading composes
  `clamp(<min>, <vw>, var(--type-<style>-size))`. Tints are
  `color-mix(in srgb, var(--token) N%, transparent)`; no drop shadows;
  transitions use `var(--motion) var(--ease)`.
- Everything sits in `@layer components` with `elb-` BEM classes.
- Each partial is added to its folder's aggregator (`_atoms.scss`,
  `_molecules.scss`, `_layout.scss`, `_viz.scss`); `index.scss` loads the four
  in that order, so a molecule's class that adjusts an atom wins at equal
  specificity. An atom's `:hover` rule is more specific, so such a class also
  repeats, under `&:hover`, every property the atom's hover rule sets.
- A demo's per-frame values are `--elb-viz-*` custom properties set from React
  with literal names; the demo's partial declares each one's default.
  Breakpoints inside a demo are container queries
  (`@container (max-width: 639px)`), so a demo follows its own width, not the
  viewport's.
- `npx walkeros-design-check src/design/components src/styles/components/design`
  (from `apps/explorer`) must pass with no allow.

### SCSS Compliance Rules (MANDATORY)

**✅ DO:**

1. Read design tokens only (see [Design Tokens](#design-tokens))
2. Follow BEM naming: `.elb-{component}-{element}--{modifier}`
3. Take type from the `--type-<style>-*` tokens where a style fits
4. Create one SCSS file per component in correct directory
5. Import new files alphabetically in `index.scss`
6. Use standard gap: `12px` for vertical spacing in flex/grid layouts
7. Check both themes in Storybook

**❌ DON'T:**

1. Use a colour literal, a `var()` fallback on a design token, a variable no
   token and no file of explorer declares, a literal font size or family, or a
   transition timing other than `var(--motion) var(--ease)`: `npm run lint` runs
   `walkeros-design-check` and fails on each, comments included (rule list:
   SKILL.md, "Design area")
2. Declare custom properties on `.elb-explorer`
3. Add drop shadows or a numeric `z-index` (use the `--z-*` tokens)
4. Use inline `style` attributes
5. Skip wrapper pattern for widgets: `elb-rjsf-widget` →
   `elb-{name}-widget-wrapper`

### Example Component SCSS

```scss
// _my-component.scss
.elb-my-component {
  // Layout
  display: flex;
  flex-direction: column;
  gap: 12px; // Standard gap

  // Box model (outside to inside)
  margin: 12px;
  border: 1px solid var(--border);
  padding: 12px;

  // Typography
  font-family: var(--font-sans);
  font-size: var(--type-product-body-size);
  line-height: var(--type-product-body-line-height);

  // Visual
  background-color: var(--surface);
  color: var(--fg);
  border-radius: var(--radius-xs);

  // Modifier
  &--primary {
    background-color: var(--primary);
    color: var(--on-primary);
  }

  // Element
  &__header {
    font-size: var(--type-product-title-size);
    font-weight: var(--type-product-title-weight);
  }

  // State
  &.-active {
    background-color: var(--surface-2);
  }
}
```

### Component Checklist

Before submitting any component:

- [ ] Placed in correct atomic layer (atoms/molecules/organisms)
- [ ] TypeScript types exported from component file
- [ ] SCSS file created with BEM naming (`elb-{component}-*`)
- [ ] SCSS imported in `index.scss` (alphabetical order)
- [ ] Reads design tokens only (`npm run lint` passes the checker)
- [ ] Type from the `--type-<style>-*` tokens where a style fits
- [ ] No inline `style` attributes
- [ ] Both themes checked in Storybook
- [ ] Build succeeds: `npm run build`

---

## Design Rules

### When to add a variable

A colour, radius, type value, container width, layer or motion value is a design
token: it is added to `design/tokens.json`, never to a component (SKILL.md,
"Design area"). A component declares a local variable only for its own geometry,
set from JavaScript or shared between its own rules (`--grid-min-box-width`), on
its own root.

### Colour

- The tokens carry the contrast rules, checked by
  `src/design/__tests__/contrast.test.ts` in both themes: text 4.5:1 on its
  grounds; control edges, the focus ring and step colours 3:1.
- `--primary` is a fill under `--on-primary`; text in the brand colour is
  `--link`.
- Event colours sit only on dark grounds (a dark island).
- Every status shows with an icon and a word, never by colour alone. Any other
  state a colour tells also gets a glyph, an edge style or a shape, and its word
  (visible, or in the tooltip and the accessible name where it does not fit).
- Syntax colours are the Palenight-based `syntax-*` tokens, dark only.

---

## Common Tasks

### Add a New Component

**1. Create Component SCSS** (`src/styles/components/_your-component.scss`):

```scss
.elb-your-component {
  background-color: var(--surface);
  color: var(--fg);
  border: 1px solid var(--border);
  border-radius: var(--radius-xs);
  padding: 12px;

  &__header {
    font-size: var(--type-product-title-size);
    font-weight: var(--type-product-title-weight);
    color: var(--fg);
    border-bottom: 1px solid var(--border);
    padding-bottom: 8px;
    margin-bottom: 12px;
  }

  &--primary {
    background-color: var(--primary);
    color: var(--on-primary);
  }
}
```

**2. Import in Main SCSS** (`src/styles/index.scss`):

```scss
@use 'components/your-component';
```

**3. Create Component** (`src/components/molecules/your-component.tsx`):

```typescript
import React from 'react';

interface YourComponentProps {
  title: string;
  variant?: 'default' | 'primary';
  children: React.ReactNode;
}

export function YourComponent({
  title,
  variant = 'default',
  children
}: YourComponentProps) {
  const className = `elb-your-component ${variant === 'primary' ? 'elb-your-component--primary' : ''}`.trim();

  return (
    <div className={className}>
      <div className="elb-your-component__header">
        {title}
      </div>
      {children}
    </div>
  );
}
```

### Change a Colour

Explorer has no theme of its own to override: its colours are the design tokens.
Change the token in `design/tokens.json` and rebuild (SKILL.md, "Design area");
every component, the Monaco theme and the constants follow.

---

## Troubleshooting

### Monaco Editor Issues

**Problem:** Monaco shows black/white background instead of theme colors

**Cause:** Monaco theme not registered before Editor mounts

**Solution:** Ensure `handleBeforeMount` registers the code theme:

```typescript
const handleBeforeMount = (monaco: typeof import('monaco-editor')) => {
  registerTheme(monaco);
  monaco.editor.setTheme(ELB_THEME_DARK);
};
```

---

**Problem:** Syntax highlighting wrong colors for specific language

**Cause:** Missing language-specific token rules

**Solution:** Add the language variant scopes to the role's token group in
`palenight.ts`:

```typescript
{ foreground: C.string, scopes: ['string', 'string.html', 'string.json'] },
```

---

**Problem:** Monaco loads from CDN despite local imports

**Cause:** `loader.config()` called after Editor mounts

**Solution:** Use static imports at module level:

```typescript
// Top of file - runs synchronously
import * as monaco from 'monaco-editor';
if (typeof window !== 'undefined') {
  loader.config({ monaco });
}
```

---

**Problem:** Height not updating when content changes

**Cause:** Monaco's `automaticLayout: true` missed resize event

**Solution:** Add ResizeObserver to force layout:

```typescript
const resizeObserver = new ResizeObserver(() => {
  requestAnimationFrame(() => editor.layout());
});
resizeObserver.observe(container);
```

---

### Grid Layout Issues

**Problem:** Boxes different heights in same row (synced mode)

**Cause:** Box height calculation missing header/border

**Solution:** Verify Box adds header (40px) + border (2px):

```typescript
const boxHeight = monacoHeight + 40 + 2;
```

---

**Problem:** Grid rows collapsing or overflowing

**Cause:** Flex container constraints not set

**Solution:** Apply flex constraints to Grid:

```scss
.elb-grid {
  display: flex;
  flex-direction: column;
  min-height: 0; // Critical for flex overflow containment

  &__row {
    display: flex;
    flex: 1;
    min-height: 0; // Also critical
  }
}
```

---

**Problem:** Heights "bouncing" during resize

**Cause:** Race condition between Monaco layout and Grid calculation

**Solution:** Use `requestAnimationFrame` to batch updates:

```typescript
requestAnimationFrame(() => {
  editor.layout();
  updateHeight(editor.getContentHeight());
});
```

---

### Theme Issues

**Problem:** A code box stays dark in the light theme

**Cause:** By design: code surfaces are dark islands (`data-theme="dark"` on
their root).

**Solution:** None needed. A box that should follow the page theme is a plain
`Box` without `theme`.

---

**Problem:** A colour does not change with the theme

**Cause:** A literal colour, or a variable that is not a design token

**Solution:** Read the token; `npm run lint` finds the literal:

```scss
// Wrong
.component {
  color: #bfc7d5;
}

// Correct
.component {
  color: var(--fg);
}
```
