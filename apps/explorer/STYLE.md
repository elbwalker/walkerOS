# Explorer Styling Guide

Complete guide to styling, theming, and customization in walkerOS Explorer.

**Quick Links:** [Quick Start](#quick-start) ·
[Theme Variables](#theme-variables) · [Grid System](#grid-system) ·
[Monaco Editor](#monaco-editor) · [SCSS Architecture](#scss-architecture)

---

## Quick Start

### Theme Switching

Explorer supports two built-in themes via the `data-theme` attribute:

```html
<!-- Dark theme (default) -->
<div data-theme="dark">
  <YourExplorerComponents />
</div>

<!-- Light theme -->
<div data-theme="light">
  <YourExplorerComponents />
</div>
```

Theme detection priority:

1. Closest ancestor `data-theme` attribute
2. Document root `data-theme` attribute
3. System preference via `prefers-color-scheme`

### Customizing Colors

Override CSS variables in your stylesheet:

```css
[data-theme='dark'] {
  --color-primary: #your-brand-color;
  --bg-box: #your-background;
  --text-primary: #your-text-color;
}
```

### Required Import

```tsx
import '@walkeros/explorer/styles.css';
```

---

## Theme Variables

### Complete Variable Reference

#### Text Colors

| Variable                     | Light     | Dark      | Usage                   |
| ---------------------------- | --------- | --------- | ----------------------- |
| `--color-text`               | `#000`    | `#e0e0e0` | Primary text            |
| `--color-text-label`         | `#424242` | `#cccccc` | Labels, headers         |
| `--color-text-button`        | `#616161` | `#cccccc` | Button text (inactive)  |
| `--color-text-button-hover`  | `#424242` | `#ffffff` | Button text on hover    |
| `--color-text-button-active` | `#1f2937` | `#ffffff` | Button text when active |
| `--color-text-muted`         | `#666`    | `#999`    | Secondary/muted text    |
| `--color-text-toggle`        | `#666`    | `#999`    | Toggle/switch labels    |
| `--color-text-input`         | `#000`    | `#e0e0e0` | Input field text        |
| `--color-text-placeholder`   | `#9ca3af` | `#666`    | Input placeholder text  |

#### Background Colors

| Variable                           | Light     | Dark                     | Usage                         |
| ---------------------------------- | --------- | ------------------------ | ----------------------------- |
| `--bg-box`                         | `#ffffff` | `#1e1e1e`                | Main container background     |
| `--bg-header`                      | `#f5f5f5` | `#252526`                | Header background             |
| `--bg-footer`                      | `#f5f5f5` | `#252526`                | Footer background             |
| `--bg-button-hover`                | `#e8e8e8` | `#2a2d2e`                | Button background on hover    |
| `--bg-button-active`               | `#ffffff` | `#1e1e1e`                | Button background when active |
| `--bg-button-group`                | `#f3f4f6` | `#2a2d2e`                | Button group container        |
| `--bg-input`                       | `#ffffff` | `#252526`                | Input field background        |
| `--bg-input-hover`                 | `#f9f9f9` | `#2a2d2e`                | Input field on hover          |
| `--bg-code-inline`                 | `#f9f9f9` | `rgba(255,255,255,0.05)` | Inline code background        |
| `--bg-dropdown`                    | `#ffffff` | `#252526`                | Dropdown menu background      |
| `--bg-dropdown-option-hover`       | `#f0f0f0` | `#2a2d2e`                | Dropdown option on hover      |
| `--bg-dropdown-option-highlighted` | `#e3f2fd` | `#1e3a5f`                | Highlighted dropdown option   |

#### Border Colors

| Variable                | Light     | Dark      | Usage                     |
| ----------------------- | --------- | --------- | ------------------------- |
| `--border-box`          | `#e0e0e0` | `#3c3c3c` | Main container border     |
| `--border-header`       | `#e0e0e0` | `#3c3c3c` | Header border             |
| `--border-footer`       | `#e0e0e0` | `#3c3c3c` | Footer border             |
| `--border-button-group` | `#d1d5db` | `#3c3c3c` | Button group borders      |
| `--border-input`        | `#d1d5db` | `#3c3c3c` | Input field border        |
| `--border-input-focus`  | `#3b82f6` | `#4a90e2` | Input border when focused |

#### Button Colors

| Variable                       | Light     | Dark      | Usage                     |
| ------------------------------ | --------- | --------- | ------------------------- |
| `--color-button-primary`       | `#3b82f6` | `#4a90e2` | Primary button background |
| `--color-button-primary-hover` | `#2563eb` | `#357abd` | Primary button on hover   |
| `--color-button-primary-text`  | `#ffffff` | `#ffffff` | Primary button text       |
| `--color-button-danger`        | `#ef4444` | `#ef4444` | Danger button background  |
| `--color-button-danger-hover`  | `#dc2626` | `#dc2626` | Danger button on hover    |
| `--color-button-danger-text`   | `#ffffff` | `#ffffff` | Danger button text        |

#### Status Colors

| Variable                  | Light     | Dark      | Usage                 |
| ------------------------- | --------- | --------- | --------------------- |
| `--color-status-enabled`  | `#22c55e` | `#22c55e` | Enabled/success state |
| `--color-status-disabled` | `#9ca3af` | `#9ca3af` | Disabled state        |
| `--color-status-warning`  | `#f59e0b` | `#f59e0b` | Warning state         |

#### Highlight Colors

Used for code highlighting and data attribute visualization.

| Variable                    | Light                    | Dark                     | Usage                        |
| --------------------------- | ------------------------ | ------------------------ | ---------------------------- |
| `--color-highlight-primary` | `#01b5e2`                | `#01b5e2`                | Primary highlight color      |
| `--highlight-globals`       | `#4fc3f7cc`              | `#4fc3f7cc`              | Global properties highlight  |
| `--highlight-context`       | `#ffbd44cc`              | `#ffbd44cc`              | Context properties highlight |
| `--highlight-entity`        | `#00ca4ecc`              | `#00ca4ecc`              | Entity name highlight        |
| `--highlight-property`      | `#ff605ccc`              | `#ff605ccc`              | Property name highlight      |
| `--highlight-action`        | `#9900ffcc`              | `#9900ffcc`              | Action name highlight        |
| `--highlight-background`    | `#1f2937`                | `#1f2937`                | Highlight tooltip background |
| `--highlight-text`          | `#9ca3af`                | `#9ca3af`                | Highlight tooltip text       |
| `--highlight-hover`         | `rgba(255,255,255,0.05)` | `rgba(255,255,255,0.05)` | Highlight hover effect       |
| `--highlight-separator`     | `rgba(255,255,255,0.05)` | `rgba(255,255,255,0.05)` | Separator in highlights      |

#### Typography

| Variable                       | Light                           | Dark | Usage                      |
| ------------------------------ | ------------------------------- | ---- | -------------------------- |
| `--font-family-base`           | `system-ui, -apple-system, ...` | Same | Base font family           |
| `--font-mono`                  | `'SF Mono', 'Monaco', ...`      | Same | Monospace font for code    |
| `--font-size-base`             | `14px`                          | Same | Base font size             |
| `--font-size-label`            | `13px`                          | Same | Label font size            |
| `--font-size-toggle`           | `12px`                          | Same | Toggle/switch font size    |
| `--font-size-highlight-button` | `0.75rem`                       | Same | Highlight button font size |
| `--line-height-base`           | `1.5`                           | Same | Base line height           |
| `--font-weight-normal`         | `400`                           | Same | Normal font weight         |
| `--font-weight-semibold`       | `600`                           | Same | Semibold font weight       |

#### Spacing & Layout

| Variable                       | Light      | Dark | Usage                          |
| ------------------------------ | ---------- | ---- | ------------------------------ |
| `--spacing-header`             | `6px 10px` | Same | Header padding                 |
| `--spacing-footer`             | `6px 10px` | Same | Footer padding                 |
| `--spacing-button`             | `4px 8px`  | Same | Button padding                 |
| `--spacing-button-group`       | `1px`      | Same | Gap between button group items |
| `--spacing-grid-gap`           | `12px`     | Same | Grid gap spacing               |
| `--grid-min-box-width`         | `350px`    | Same | Minimum box width in grid      |
| `--grid-row-min-height`        | `250px`    | Same | Minimum grid row height        |
| `--grid-row-max-height`        | `450px`    | Same | Maximum grid row height        |
| `--grid-box-max-height-mobile` | `500px`    | Same | Max box height on mobile       |

#### Border Radius

| Variable                    | Light | Dark | Usage                          |
| --------------------------- | ----- | ---- | ------------------------------ |
| `--radius-box`              | `4px` | Same | Main container border radius   |
| `--radius-button`           | `3px` | Same | Button border radius           |
| `--radius-button-group`     | `4px` | Same | Button group border radius     |
| `--radius-highlight-button` | `6px` | Same | Highlight button border radius |

#### Shadows

| Variable                 | Light                       | Dark                        | Usage                |
| ------------------------ | --------------------------- | --------------------------- | -------------------- |
| `--shadow-button-active` | `0 1px 2px rgba(0,0,0,0.1)` | `0 1px 2px rgba(0,0,0,0.3)` | Active button shadow |
| `--shadow-dropdown`      | `0 4px 6px rgba(0,0,0,0.1)` | `0 4px 6px rgba(0,0,0,0.5)` | Dropdown shadow      |

#### Monaco Editor

| Variable               | Light  | Dark | Usage                     |
| ---------------------- | ------ | ---- | ------------------------- |
| `--monaco-font-size`   | `13px` | Same | Monaco editor font size   |
| `--monaco-line-height` | `1.5`  | Same | Monaco editor line height |

### Customization Examples

**Custom Brand Colors:**

```css
.elb-explorer {
  --color-button-primary: #ff6b35;
  --color-button-primary-hover: #ff5722;
  --border-input-focus: #ff6b35;
}
```

**Larger Fonts for Accessibility:**

```css
.elb-explorer {
  --font-size-base: 16px;
  --font-size-label: 15px;
  --monaco-font-size: 15px;
  --line-height-base: 1.6;
}
```

**High Contrast Theme:**

```css
[data-theme='light'] .elb-explorer {
  --color-text: #000000;
  --bg-box: #ffffff;
  --border-box: #000000;
  --color-button-primary: #0000ff;
}

[data-theme='dark'] .elb-explorer {
  --color-text: #ffffff;
  --bg-box: #000000;
  --border-box: #ffffff;
  --color-button-primary: #00ffff;
}
```

---

## Grid System

Explorer uses a sophisticated Grid component with three height modes for
responsive layouts.

### Height Modes

**1. Equal Heights** - All boxes in same row share the tallest content height

```tsx
<Grid columns={3} heightMode="equal">
  <CodeBox code={event} />
  <CodeBox code={mapping} />
  <CodeBox code={output} />
</Grid>
```

**2. Auto Heights** - Each box sized independently to content

```tsx
<Grid columns={3} heightMode="auto">
  <CodeBox code={shortEvent} />
  <CodeBox code={longMapping} />
  <CodeBox code={mediumOutput} />
</Grid>
```

**3. Synced Heights** - Boxes in same row share height, different rows can
differ

```tsx
<Grid columns={3} heightMode="synced">
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
- [box.tsx](./src/components/molecules/box.tsx) - Total height calculation
- [grid.tsx](./src/components/organisms/grid.tsx) - Row height orchestration

**Common Pitfalls:**

1. **Forgetting Box overhead** - Always add header (40px) + border (2px) to
   Monaco height
2. **Not handling async layout** - Monaco's layout() is async, use callbacks
3. **ResizeObserver loops** - Debounce layout calls with requestAnimationFrame
4. **Theme-specific heights** - Test both light and dark themes for consistency

**Usage Guidelines:**

```tsx
// Grid context - Don't use autoHeight (maintains equal row heights)
<Grid columns={3} heightMode="synced">
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

### Theme Integration

Explorer includes two Monaco themes that automatically sync with `data-theme`
attribute:

- **`elbTheme-dark`** - Dark theme based on Prism Palenight
- **`elbTheme-light`** - Light theme based on GitHub syntax highlighting

**Automatic Theme Switching:**

```typescript
// Theme detection in code.tsx
const checkTheme = () => {
  const dataTheme = getDataTheme();
  const isDark =
    dataTheme === 'dark' ||
    (dataTheme === null &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);
  const newTheme = isDark ? 'elbTheme-dark' : 'elbTheme-light';
  setMonacoTheme(newTheme);
};
```

### Token Color Palette (Dark Theme)

Current color scheme matches Prism Palenight:

| Token Type        | Color     | Usage                     |
| ----------------- | --------- | ------------------------- |
| Comments          | `#697098` | Gray, italic              |
| Strings           | `#c3e88d` | Green                     |
| Numbers           | `#f78c6c` | Orange                    |
| Functions         | `#82aaff` | Blue                      |
| Delimiters        | `#c792ea` | Purple (braces, brackets) |
| Operators         | `#89ddff` | Cyan                      |
| Keywords          | `#c084fc` | Bright purple, italic     |
| Types/Classes     | `#ffcb6b` | Yellow/gold               |
| Variables         | `#bfc7d5` | Light gray                |
| Booleans          | `#ff5874` | Red                       |
| Tags (HTML)       | `#bfc7d5` | Light gray                |
| Attributes (HTML) | `#bfc7d5` | Light gray                |

### Language-Specific Token Rules

**Critical**: Monaco uses specific token names per language. Always add
language-specific rules for proper highlighting:

```typescript
// Generic rule (may not work)
{ token: 'string', foreground: 'c3e88d' },

// Language-specific rules (work reliably)
{ token: 'string.html', foreground: 'c3e88d' },
{ token: 'string.json', foreground: 'c3e88d' },
{ token: 'string.js', foreground: 'c3e88d' },
{ token: 'string.ts', foreground: 'c3e88d' },
{ token: 'string.value.json', foreground: 'c3e88d' },
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

```typescript
colors: {
  // Transparent backgrounds let CSS variables control color
  'editor.background': '#00000000',
  'editorGutter.background': '#00000000',
  'editor.lineHighlightBackground': '#00000000',

  // CRITICAL: Sticky scroll MUST have solid background
  'editorStickyScroll.background': '#1e1e2e',

  // Cursor/selection transparent for read-only snippets
  'editorCursor.foreground': '#00000000',
  'editor.selectionBackground': '#00000000',
}
```

### Custom Monaco Themes

To create a custom Monaco theme:

```typescript
import { lighthouseTheme } from '@walkeros/explorer';
import type { editor } from 'monaco-editor';

const customTheme: editor.IStandaloneThemeData = {
  ...lighthouseTheme,
  rules: [
    ...lighthouseTheme.rules,
    { token: 'string', foreground: '00ff00' }, // Green strings
  ],
};

// Register in Code component's beforeMount
<Code
  code={code}
  beforeMount={(monaco) => {
    monaco.editor.defineTheme('my-custom-theme', customTheme);
    monaco.editor.setTheme('my-custom-theme');
  }}
/>
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
// Before (not working)
{ token: 'keyword', foreground: 'c084fc' }

// After (works)
{ token: 'keyword.const.ts', foreground: 'c084fc' }
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
  registerAllThemes(monaco);
  monaco.editor.setTheme('elbTheme-dark');
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
// Static schema (e.g., Flow.Setup)
import { setupV2JsonSchema } from '@walkeros/core/dev';

<CodeBox
  code={flowJson}
  onChange={setFlowJson}
  language="json"
  showFormat
  jsonSchema={setupV2JsonSchema as Record<string, unknown>}
/>;
```

**What the prop enables:**

- `quickSuggestions` — auto-popup on typing (normally disabled)
- `renderValidationDecorations` — red squiggles for schema violations
- `hover` — tooltip descriptions from schema `description` fields
- Unique model `path` — auto-generated to isolate schema per editor instance

**`intellisenseContext` prop:** Provides `$var.`, `$def.`, `$secret.`
completions, hover tooltips, and semantic validation markers. Also generates a
unique model `path` and enables `quickSuggestions` and `hover` independently of
`jsonSchema`. Both props can be combined for full schema validation +
context-driven features.

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
├── theme/
│   ├── _tokens.scss        # SCSS tokens ($spacing-md: 12px)
│   ├── _variables.scss     # CSS variables (--bg-input, --color-text)
│   └── _dark.scss          # Dark theme overrides
├── foundation/
│   ├── _reset.scss
│   ├── _typography.scss
│   ├── _layout.scss        # Grid/flex mixins
│   ├── _spacing.scss
│   └── _responsive.scss    # Breakpoint mixins
└── components/
    ├── atoms/              # _button.scss, _toggle.scss, etc.
    ├── molecules/          # _code-panel.scss, _tree-sidebar.scss
    └── organisms/          # _box.scss, _grid.scss, _live-code.scss
```

### SCSS Compliance Rules (MANDATORY)

**✅ DO:**

1. Use ONLY defined CSS variables from `theme/_variables.scss`
2. Follow BEM naming: `.elb-{component}-{element}--{modifier}`
3. Use `calc(var(--font-size-base) - 1px)` for font size variations
4. Create one SCSS file per component in correct directory
5. Import new files alphabetically in `index.scss`
6. Use standard gap: `12px` for vertical spacing in flex/grid layouts
7. Test in both light and dark themes

**❌ DON'T:**

1. Use undefined CSS variables (e.g., `--bg-secondary`, `--font-size-sm`)
2. Use `--font-family-mono` (correct: `--font-mono`)
3. Hardcode colors, spacing, or font sizes
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
  margin: var(--spacing-md);
  border: 1px solid var(--border-box);
  padding: var(--spacing-md);

  // Typography
  font-family: var(--font-family-base);
  font-size: var(--font-size-base);

  // Visual
  background-color: var(--bg-box);
  color: var(--color-text);
  border-radius: var(--radius-box);

  // Modifier
  &--primary {
    background-color: var(--color-button-primary);
    color: white;
  }

  // Element
  &__header {
    font-size: calc(var(--font-size-base) + 2px);
    font-weight: 600;
  }

  // State
  &.-active {
    background-color: var(--color-button-primary);
  }
}
```

### Component Checklist

Before submitting any component:

- [ ] Placed in correct atomic layer (atoms/molecules/organisms)
- [ ] TypeScript types exported from component file
- [ ] SCSS file created with BEM naming (`elb-{component}-*`)
- [ ] SCSS imported in `index.scss` (alphabetical order)
- [ ] All CSS variables exist in `theme/_variables.scss`
- [ ] No hardcoded values (colors, spacing, fonts)
- [ ] Uses `calc(var(--font-size-base) - Npx)` for size variations
- [ ] No inline `style` attributes
- [ ] Light and dark theme tested
- [ ] Build succeeds: `npm run build`

---

## Design Rules

### When to Add CSS Variables

Add a CSS variable when:

1. **Color appears in 2+ places** - Ensures consistency
2. **Value should be theme-aware** - Different light/dark values
3. **Users might customize** - Exposed as customization API
4. **Component-specific but reused** - Like `--pane-header-height`

Don't add CSS variables for:

1. **One-off values** - Use literal values in component SCSS
2. **Calculated values** - Use SCSS math instead
3. **Values that never change** - Like specific font names

### Color Selection Guidelines

**Primary Colors:**

- Use for interactive elements (buttons, links, focus states)
- Should have 4.5:1 contrast ratio with background
- Provide variants (hover, active, disabled)

**Text Colors:**

- Primary text: 7:1 contrast minimum
- Secondary text: 4.5:1 contrast minimum
- Always test with
  [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)

**Syntax Highlighting:**

- Follow established palette (Prism Palenight for dark, GitHub for light)
- Ensure readability (4.5:1 minimum for code)
- Use semantic colors (green for strings, red for errors)

**Accessibility:**

- All interactive elements: 3:1 contrast with background minimum
- Focus indicators: 3:1 contrast with adjacent colors
- Test with multiple color vision deficiencies

---

## Common Tasks

### Add a New Component

**1. Create Component SCSS** (`src/styles/components/_your-component.scss`):

```scss
@use '../theme/variables';

.elb-your-component {
  background-color: var(--bg-box);
  color: var(--color-text);
  border: 1px solid var(--border-box);
  border-radius: var(--radius-box);
  padding: var(--spacing-md);

  &__header {
    font-size: calc(var(--font-size-base) + 2px);
    font-weight: 600;
    color: var(--color-text);
    border-bottom: 1px solid var(--border-box);
    padding-bottom: var(--spacing-sm);
    margin-bottom: var(--spacing-md);
  }

  &--primary {
    background-color: var(--color-button-primary);
    color: white;
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

### Customize Theme Colors

**Option 1: Override CSS Variables** (Recommended)

```css
/* custom-theme.css */
[data-theme='dark'] {
  --color-button-primary: #your-brand-color;
  --bg-app: #your-dark-bg;
  --bg-box: #your-dark-box-bg;
  --color-text: #your-dark-text;
}

[data-theme='light'] {
  --color-button-primary: #your-brand-color;
  --bg-app: #your-light-bg;
  --bg-box: #your-light-box-bg;
  --color-text: #your-light-text;
}
```

Import after Explorer styles:

```typescript
import '@walkeros/explorer/dist/index.css';
import './custom-theme.css'; // Overrides Explorer defaults
```

**Option 2: Fork and Modify** (Advanced)

1. Clone Explorer package
2. Modify `src/styles/_variables.scss`
3. Rebuild with `npm run build`
4. Use local build instead of npm package

---

## Troubleshooting

### Monaco Editor Issues

**Problem:** Monaco shows black/white background instead of theme colors

**Cause:** Monaco theme not registered before Editor mounts

**Solution:** Ensure `handleBeforeMount` registers themes:

```typescript
const handleBeforeMount = (monaco: typeof import('monaco-editor')) => {
  registerAllThemes(monaco);
  monaco.editor.setTheme('elbTheme-dark');
};
```

---

**Problem:** Syntax highlighting wrong colors for specific language

**Cause:** Missing language-specific token rules

**Solution:** Add language variant rules:

```typescript
{ token: 'string', foreground: 'c3e88d' },        // Generic
{ token: 'string.html', foreground: 'c3e88d' },   // HTML-specific
{ token: 'string.json', foreground: 'c3e88d' },   // JSON-specific
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

### Theme Switching Issues

**Problem:** Theme changes but Monaco stays same color

**Cause:** Monaco theme name doesn't match data-theme value

**Solution:** Map data-theme to Monaco theme name:

```typescript
const themeName = dataTheme === 'dark' ? 'elbTheme-dark' : 'elbTheme-light';
setMonacoTheme(themeName);
```

---

**Problem:** CSS variables update but colors don't change

**Cause:** Components caching old CSS variable values

**Solution:** CSS variables update immediately - check for hard-coded colors:

```scss
// Wrong
.component {
  color: #bfc7d5;
}

// Correct
.component {
  color: var(--color-text);
}
```

---

## Change Log

### November 2025

**HTML Token Standardization**

- Changed HTML tag colors from red (#ff5572) to light gray (#bfc7d5)
- Changed HTML attribute colors from green (#c3e88d) to light gray (#bfc7d5)
- Kept attribute string values green for consistency
- Added comprehensive HTML-specific token rules

**Debug Logging Cleanup**

- Removed all console.log statements from production code
- Cleaned up code.tsx, monaco-setup.ts, theme files

**Documentation Consolidation**

- Created unified STYLE.md as single source of truth
- Archived historical docs (STYLE.md, THEME.md, etc.)
- Eliminated ~30% duplicate content

### October 2025

**Monaco Theme Rename**

- Renamed `palenight` theme to `elbTheme-dark`
- Renamed `lighthouse` theme to `elbTheme-light`
- Updated all references

**Local Monaco Loading**

- Migrated from CDN to local npm package loading
- Added static imports for Monaco and language workers
- Configured MonacoEnvironment for Vite workers

**Language-Specific Token Rules**

- Added HTML-specific tokens
- Added JSON-specific tokens
- Added JavaScript/TypeScript-specific tokens
- Improved token matching reliability

### September 2025

**Website Color Alignment**

- Aligned Explorer colors with walkerOS website
- Updated Prism Palenight colors for dark theme
- Updated GitHub colors for light theme

**Contrast Improvements**

- Fixed low-contrast text issues (7:1 for primary text)
- Fixed button contrast issues (4.5:1 minimum)
- Fixed border contrast issues (3:1 minimum)
- WCAG AA compliance achieved

---

**Last Updated:** 2025-11-06
