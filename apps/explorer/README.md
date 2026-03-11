# walkerOS Explorer

Interactive React components for walkerOS documentation and exploration.
Provides ready-to-use demo components with Monaco Editor integration for live
code editing and event visualization.

## Installation

```bash
npm install @walkeros/explorer
```

## Usage

```tsx
import { MappingDemo } from '@walkeros/explorer';
import '@walkeros/explorer/styles.css';
```

## Architecture

Components follow atomic design principles:

- **Atoms**: Basic UI elements (Box, Button, Header, ButtonGroup, Toggle, etc.)
- **Molecules**: Component combinations (AutoSelect, MappingEditor, TreeSidebar)
- **Organisms**: Complex components (MappingBox, CodeBox, MappingEditorTabs)
- **Demos**: Ready-to-use complete demos (MappingDemo, DestinationDemo)

### Design Principles

**Component Reusability**

- All components are composable and reusable
- Shared components over duplicate code
- Atomic design ensures scalability

**No Inline Styles**

- All styling via CSS classes and CSS variables
- Inline styles are forbidden
- Use CSS modules or SCSS for styling

**Theme Support Required**

- All components support light/dark themes
- Theme switching via `data-theme` attribute
- CSS variables automatically adapt

## Components

### Demos (Ready-to-Use)

#### MappingDemo

Interactive three-panel editor: input → config → output transformation.

```tsx
<MappingDemo
  input='{"name": "example"}'
  config='{"transform": "uppercase"}'
  labelInput="Event"
  labelConfig="Rules"
  labelOutput="Result"
  fn={async (input, config) => {
    const data = JSON.parse(input);
    const rules = JSON.parse(config);
    return JSON.stringify(result, null, 2);
  }}
/>
```

#### DestinationDemo

Interactive destination testing with event processing and mapping. Automatically
captures destination.push() calls and displays the output.

**Simple Usage** (Recommended):

```tsx
import { DestinationDemo } from '@walkeros/explorer';
import { getEvent } from '@walkeros/core';
import destinationPlausible from '@walkeros/web-destination-plausible';
import { examples } from '@walkeros/web-destination-plausible';

// Attach examples to destination for auto-capture
const destination = { ...destinationPlausible, examples };

<DestinationDemo
  destination={destination}
  event={getEvent('order complete')}
  mapping={examples.mapping.purchase}
  settings={{ domain: 'elbwalker.com' }}
  generic={true}
/>;
```

The component auto-detects `destination.examples.env.push` and uses it to
capture function calls.

**Props:**

- `destination`: Destination instance with `examples.env.push` export
- `event`: walkerOS event to process
- `mapping`: Optional mapping rules (object or JSON string)
- `settings`: Destination-specific settings
- `generic`: If true, wraps mapping in `{ '*': { '*': mapping } }`
- `labelEvent`: Label for event panel (default: 'Event')
- `labelMapping`: Label for mapping panel (default: 'Mapping')
- `labelOutput`: Label for output panel (default: 'Result')

#### DestinationInitDemo

Interactive destination initialization testing. Automatically captures
destination.init() calls and displays the output (script loading, configuration
calls).

**Simple Usage** (Recommended):

```tsx
import { DestinationInitDemo } from '@walkeros/explorer';
import destinationGtag from '@walkeros/web-destination-gtag';
import { examples } from '@walkeros/web-destination-gtag';

// Attach examples to destination for auto-capture
const destination = { ...destinationGtag, examples };

<DestinationInitDemo
  destination={destination}
  settings={{
    ga4: {
      measurementId: 'G-XXXXXXXXXX',
      debug: false,
      pageview: false,
    },
  }}
/>;
```

The component auto-detects `destination.examples.env.init` and uses it to
capture function calls during initialization.

**Props:**

- `destination`: Destination instance with `examples.env.init` export
- `settings`: Destination-specific settings (object or JSON string)
- `labelSettings`: Label for settings panel (default: 'Settings')
- `labelOutput`: Label for output panel (default: 'Result')

**Use Cases:**

- Testing destination initialization (script loading, gtag config calls)
- Documenting initialization behavior
- Debugging destination setup

#### PromotionPlayground

Interactive playground for walkerOS promotion events (used in documentation).

### Organisms

#### MappingBox

Visual mapping configuration editor with code view toggle.

```tsx
import { MappingBox } from '@walkeros/explorer';

<MappingBox
  mapping={{
    product: {
      view: { name: 'view_item', data: { map: { value: 'data.price' } } },
    },
  }}
  onMappingChange={setMapping}
  label="GA4 Mapping"
  useNewEditor={true}
  showTree={true}
/>;
```

Features:

- Visual/Code view toggle
- Tab-based navigation
- Tree sidebar with breadcrumbs
- Property-focused editing panels
- RJSF-based forms with custom widgets

#### MappingEditorTabs

Advanced tab-based mapping editor with tree navigation.

```tsx
import { MappingEditorTabs } from '@walkeros/explorer';

<MappingEditorTabs
  initialMapping={config}
  onChange={handleChange}
  layout="responsive"
  showTree={true}
/>;
```

Layouts:

- `compact`: Single column, mobile-optimized (< 800px)
- `medium`: Two columns with collapsible sidebar (800-1200px)
- `wide`: Three columns with persistent sidebar (> 1200px)
- `responsive`: Auto-detects based on viewport

#### LiveCode

Generic live code execution with input/config/output panels.

```tsx
<LiveCode
  input={{ name: 'test event', data: {} }}
  config={{ mapping: 'rules' }}
  fn={async (input, config, log) => {
    log('Processing...', input);
  }}
  fnName="myFunction"
/>
```

#### CodePanel

Monaco editor with label and formatting controls.

```tsx
<CodePanel
  label="Configuration"
  value='{"key": "value"}'
  language="json"
  onChange={setValue}
/>
```

#### BrowserBox

Multi-tab code editor (HTML/CSS/JS) with live preview.

```tsx
<BrowserBox
  html="<div>Hello</div>"
  css="div { color: red; }"
  js="console.log('loaded')"
  onHtmlChange={setHtml}
  showPreview={true}
  initialTab="preview"
/>
```

#### CollectorBox

Displays collector processing with mapping and destination output.

```tsx
<CollectorBox
  event='{"name": "page view"}'
  mapping='{"page": {"view": {"name": "pageview"}}}'
  destination={destination}
/>
```

### Molecules

#### CodeEditor

Monaco Editor wrapper.

```tsx
<CodeEditor
  value="console.log('hello')"
  language="javascript"
  onChange={setValue}
/>
```

#### Preview

HTML preview in isolated iframe with walkerOS event capture.

```tsx
<Preview
  html="<div data-elb='product'>Item</div>"
  css="div { padding: 20px; }"
  onEvent={(event) => console.log(event)}
/>
```

#### MappingTreeSidebar

Hierarchical tree view for mapping navigation.

```tsx
import { MappingTreeSidebar } from '@walkeros/explorer';

<MappingTreeSidebar
  config={mappingConfig}
  currentPath={['product', 'view']}
  expandedPaths={expandedPaths}
  visible={true}
  onToggle={handleToggle}
  onNavigate={handleNavigate}
  onAddAction={handleAddAction}
  onAddEntity={handleAddEntity}
/>;
```

#### AutoSelect

Dropdown with autocomplete for key selection.

```tsx
import { AutoSelect } from '@walkeros/explorer';

<AutoSelect
  value={selectedKey}
  options={['data.id', 'data.name', 'user.email']}
  onChange={setValue}
  placeholder="Select property..."
/>;
```

### Atoms

#### Box, Header, Button, ButtonGroup

Basic UI building blocks. See exported types for prop details.

```tsx
import { Box, Button, ButtonGroup } from '@walkeros/explorer';

<Box header="Title" resizable={true}>
  <ButtonGroup
    buttons={[
      { label: 'Option 1', value: '1', active: true },
      { label: 'Option 2', value: '2', active: false },
    ]}
    onButtonClick={handleClick}
  />
</Box>;
```

#### Toggle

Theme-aware toggle switch component.

```tsx
import { Toggle } from '@walkeros/explorer';

<Toggle checked={isEnabled} onChange={setIsEnabled} label="Enable feature" />;
```

### Helpers

#### Destination Creators

```tsx
import {
  createGtagDestination,
  createFbqDestination,
  createPlausibleDestination,
} from '@walkeros/explorer';

const gtag = createGtagDestination();
gtag.env = { elb: (output) => console.log(output) };
```

## Styling

**Complete styling documentation:** [STYLE.md](./STYLE.md)

### Quick Start

```tsx
import '@walkeros/explorer/styles.css';
```

```html
<!-- Theme switching -->
<html data-theme="dark">
  ...
</html>
```

### Customization

```css
.my-app .elb-explorer {
  --color-button-primary: #ff6b35;
  --bg-box: #fafafa;
  --font-size-base: 16px;
}
```

**See [STYLE.md](./STYLE.md) for:**

- Complete Theme Variables Reference (all CSS variables)
- Grid System (height modes, implementation)
- Monaco Editor (theming, tokens, IntelliSense)
- SCSS Architecture & Design Rules
- Common Tasks & Troubleshooting

### Component Styling Guidelines

When contributing components:

**✅ DO:**

- Use CSS classes with the `elb-` prefix
- Use CSS variables for colors, spacing, typography
- Support both light and dark themes
- Use responsive design patterns
- Reuse existing components and styles

**❌ DON'T:**

- Use inline `style` attributes
- Hardcode colors or spacing values
- Create duplicate components
- Use theme-specific selectors in component files
- Use magic numbers (use CSS variables instead)

### SCSS Architecture (CRITICAL - Must Follow Exactly)

**IMPORTANCE**: The explorer uses a strict, modular SCSS architecture. All new
components MUST follow the established patterns. Non-compliance breaks the
design system.

**Architecture:**

```
src/styles/
├── index.scss              # Main entry point (import new components here)
├── theme/
│   ├── _tokens.scss        # SCSS tokens ($spacing-md: 12px, $radius-sm: 3px)
│   ├── _variables.scss     # CSS variables (--bg-input, --color-text, etc.)
│   └── _dark.scss          # Dark theme overrides
├── foundation/
│   ├── _reset.scss
│   ├── _typography.scss
│   ├── _layout.scss        # Grid/flex mixins
│   ├── _spacing.scss       # Spacing mixins
│   └── _responsive.scss    # Breakpoint mixins
└── components/
    ├── atoms/              # _button.scss, _consent-widget.scss, etc.
    ├── molecules/          # _rjsf-form.scss, _mapping-editor.scss, etc.
    └── organisms/          # _box.scss, _mapping-box.scss, etc.
```

#### SCSS Compliance Rules (MANDATORY)

**✅ DO:**

1. **Use ONLY defined CSS variables** from `theme/_variables.scss`:
   - `--bg-input`, `--border-input`, `--radius-button` (standard form elements)
   - `--color-text`, `--color-text-muted`, `--color-text-label` (typography)
   - `--font-family-base`, `--font-mono` (fonts)
   - `--font-size-base` (base font size)
2. **Use `calc()` for font size variations**:
   - Small text: `calc(var(--font-size-base) - 1px)` (NOT `--font-size-sm`)
   - Tiny text: `calc(var(--font-size-base) - 2px)` (NOT `--font-size-xs`)
3. **Follow BEM naming**: `elb-{component}-{element}--{modifier}`
   - Example: `.elb-settings-widget-wrapper`, `.elb-settings-widget-form`
4. **Use standard gaps**: `12px` for vertical spacing in flex/grid layouts
5. **One file per component**: Create `_component-name.scss` in appropriate
   directory
6. **Import alphabetically**: Add `@use './components/atoms/your-widget';` in
   `index.scss`

**❌ DON'T:**

1. **NEVER use undefined CSS variables**:
   - ❌ `--bg-secondary`, `--bg-code`, `--border-subtle`, `--radius-base` (don't
     exist)
   - ❌ `--font-size-sm`, `--font-size-xs` (don't exist as CSS variables)
   - ❌ `--font-family-mono` (should be `--font-mono`)
2. **NEVER hardcode values** that have CSS variable equivalents
3. **NEVER skip the wrapper pattern**: All widgets need `elb-rjsf-widget` →
   `elb-{name}-widget-wrapper`
4. **NEVER create duplicate styles** - check existing components first

#### CSS Variable Reference (Commonly Used)

```scss
// Backgrounds
--bg-input: #ffffff; // Form inputs, fallback containers
--bg-input-hover: #f9f9f9; // Hover states

// Borders
--border-input: #d1d5db; // Form inputs, containers
--border-input-focus: #3b82f6; // Focus states

// Border Radius
--radius-button: 3px; // Forms, small elements
--radius-box: 4px; // Boxes, containers

// Typography
--color-text: #000; // Primary text
--color-text-muted: #666; // Secondary/hint text
--color-text-label: #424242; // Labels
--font-family-base: system-ui, ...; // Body text
--font-mono: 'SF Mono', ...; // Code blocks
--font-size-base: 14px; // Base size

// Buttons
--color-button-primary: #3b82f6; // Primary actions
--color-button-danger: #ef4444; // Destructive actions
```

**Full list**: See `src/styles/theme/_variables.scss`

#### Example: Widget SCSS (Correct Pattern)

```scss
// _my-widget.scss
.elb-my-widget-wrapper {
  width: 100%;
}

.elb-my-widget-form {
  display: flex;
  flex-direction: column;
  gap: 12px; // Standard gap
}

.elb-my-widget-hint {
  font-size: calc(var(--font-size-base) - 1px); // ✅ Correct
  color: var(--color-text-muted); // ✅ Defined variable
  margin: 0;
}

.elb-my-widget-code {
  padding: 12px;
  background-color: var(--bg-input); // ✅ Defined variable
  border: 1px solid var(--border-input); // ✅ Defined variable
  border-radius: var(--radius-button); // ✅ Defined variable
  font-family: var(--font-mono); // ✅ Correct variable name
}
```

#### Verification Checklist

Before submitting SCSS changes:

- [ ] All CSS variables exist in `theme/_variables.scss`
- [ ] No hardcoded colors, spacing, or font sizes (use CSS variables)
- [ ] BEM naming convention followed (`elb-{component}-{element}`)
- [ ] File imported in `index.scss` (alphabetical order)
- [ ] Build succeeds: `npm run build`
- [ ] Component matches pattern of similar existing components
- [ ] Tested in both light and dark themes

See [LAYOUT.md](./LAYOUT.md) for the complete SCSS migration plan.

## Development

```bash
npm install        # Install dependencies
npm run start      # Start Vite dev server
npm test           # Run tests
npm run build      # Build package
npm run lint       # Lint code
```

### Contributing Components

Follow these principles when creating new components:

1. **Atomic Design**: Place components in correct directory
   (atoms/molecules/organisms)
2. **Reusability**: Extract shared logic into hooks, shared styles into SCSS
   modules
3. **Theme Support**: Use CSS variables, test both light/dark themes
4. **No Inline Styles**: All styling via CSS classes
5. **TypeScript**: Strict typing, export all public types
6. **Accessibility**: Semantic HTML, ARIA attributes, keyboard navigation
7. **RJSF Patterns**: Follow Field/Widget separation for RJSF components (see
   [PATTERNS.md](./PATTERNS.md))

### RJSF Component Architecture (CRITICAL)

**When creating RJSF custom components, you MUST follow the Field/Widget
separation pattern.**

See [PATTERNS.md](./PATTERNS.md) for comprehensive documentation of:

- **Field/Widget Separation**: Mandatory two-layer architecture
- **Component Composition**: MappingCollapsible, MappingFormWrapper, IconButton
- **State Management**: Controlled state, external sync, deduplication
- **Data Flow**: Schema passing via `ui:options`, props threading
- **CSS Conventions**: BEM with `elb-` prefix
- **Common Utilities**: `cleanFormData`, type guards, validators
- **Anti-Patterns**: What NOT to do (with examples)

**Quick Reference - All RJSF Components:**

| Field                   | Widget                   | Purpose                   |
| ----------------------- | ------------------------ | ------------------------- |
| `MappingConsentField`   | `MappingConsentWidget`   | Consent states (checkbox) |
| `MappingConditionField` | `MappingConditionWidget` | Condition code editor     |
| `MappingDataField`      | `MappingDataWidget`      | Data transformation rows  |
| `MappingGlobalsField`   | `MappingGlobalsWidget`   | Global properties         |
| `MappingContextField`   | `MappingContextWidget`   | Context properties        |
| `MappingNestedField`    | `MappingNestedWidget`    | Nested entities           |
| `MappingSettingsField`  | `MappingSettingsWidget`  | Destination settings      |

**Field responsibilities** (~20 lines):

- Convert `FieldProps` → `WidgetProps`
- Pass through props (id, value, onChange, schema, uiSchema, rawErrors,
  disabled, readonly)
- No UI logic

**Widget responsibilities** (100-300 lines):

- Implement full UI using standard building blocks
- Manage component state (expand/collapse, show/hide, previous values)
- Handle form changes and cleanup
- Sync with external value changes via `useEffect`
- Use `MappingCollapsible` for toggle/checkbox UI
- Use `MappingFormWrapper` for nested forms
- Use `IconButton` for actions
- Use `cleanFormData` to remove empty values

See [PATTERNS.md](./PATTERNS.md) for detailed examples and implementation
checklist.

### Component Checklist

**Before submitting any component:**

- [ ] Component placed in correct atomic layer (atoms/molecules/organisms)
- [ ] TypeScript types exported from component file
- [ ] **SCSS compliance verified** (see SCSS Architecture section above):
  - [ ] All CSS variables exist in `theme/_variables.scss`
  - [ ] BEM naming: `elb-{component}-{element}`
  - [ ] SCSS file created in correct directory (`atoms/`, `molecules/`,
        `organisms/`)
  - [ ] SCSS imported in `index.scss` (alphabetical order)
  - [ ] No hardcoded values (colors, spacing, fonts)
  - [ ] Uses `calc(var(--font-size-base) - Npx)` for size variations
- [ ] Light and dark theme tested
- [ ] No inline `style` attributes
- [ ] Responsive design considered
- [ ] Reuses existing components where possible (MappingCollapsible, IconButton,
      etc.)
- [ ] **RJSF components follow Field/Widget separation pattern** (see
      [PATTERNS.md](./PATTERNS.md))
- [ ] Build succeeds: `npm run build`
- [ ] Exported from `src/index.ts` (if public API)

## Monaco Editor Height Management

The explorer uses Monaco Editor with a flexible, responsive height system that
works across all contexts.

### Height Modes

CodeBox supports three height modes:

1. **Default (height="100%")**: Fills parent container
   - Use in Grid contexts for equal row heights
   - Use in Flex contexts to fill available space
   - Requires parent with explicit height or bounded context

2. **Auto-height (autoHeight prop)**: Dynamically sizes to content
   - Grows/shrinks based on Monaco's content height
   - Respects min/max boundaries (customizable)
   - Eliminates blank space in standalone contexts
   - Updates automatically when content changes

3. **Explicit height**: Fixed pixel or viewport height
   - Override with `height` prop (e.g., `height="600px"` or `height="50vh"`)

### Usage Examples

**Grid Context - Equal Heights:**

```tsx
// Don't use autoHeight - maintains equal row heights
<Grid columns={3}>
  <CodeBox code={event} label="Event" />
  <CodeBox code={mapping} label="Mapping" />
  <CodeBox code={output} label="Output" />
</Grid>
```

**Standalone - Content-Based Height:**

```tsx
// Use autoHeight to eliminate blank space
<CodeBox
  code={setupExample}
  label="Setup"
  autoHeight={{ min: 100, max: 600 }}
  disabled
/>
```

**Flex Context - Fill Parent:**

```tsx
// Don't use autoHeight - fills available flex space
<div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
  <CodeBox code={largeConfig} onChange={setConfig} />
</div>
```

**Explicit Height Override:**

```tsx
<CodeBox code={longCode} height="600px" />
```

### How Auto-Height Works

When `autoHeight` is enabled:

1. Monaco Editor's `getContentHeight()` API measures actual content height
2. Hook listens to `onDidContentSizeChange` events (debounced)
3. Height calculated and bounded by min/max values
4. Monaco receives explicit pixel height (e.g., `height="347px"`)
5. Updates automatically on content changes, typing, or formatting

**Technical Details:**

- Uses `useMonacoHeight` hook with Monaco's official APIs
- Avoids infinite loops by not calling `layout()` in content change handler
- Includes overhead calculation for header/borders (45px)
- Default boundaries: min=100px, max=600px (customizable)

### Key Files

- `explorer/src/components/atoms/code.tsx` - Monaco wrapper with autoHeight
  integration
- `explorer/src/hooks/useMonacoHeight.ts` - Content height calculation hook
- `explorer/src/styles/components/atoms/_code.scss` - Flex-based Monaco
  container
- `explorer/src/styles/components/organisms/_box.scss` - Context-specific height
  rules

### Troubleshooting

**Monaco shows wrong height?**

- Check parent context: Grid, Flex, or standalone?
- Grid/Flex: Don't use autoHeight (use default height="100%")
- Standalone: Add `autoHeight={{ min: 100, max: 600 }}`
- Override with explicit `height` prop if needed

**AutoHeight not working?**

- Ensure Monaco has mounted (check browser console for errors)
- Verify min/max boundaries aren't too restrictive
- Check that content is actually rendering (empty code = min height)

**Height grows infinitely?**

- Should not happen with current implementation
- Hook avoids calling `layout()` in content change handler
- Report if you encounter this bug

## Browser Support

Chrome 80+, Firefox 75+, Safari 13+, Edge 80+

## License

MIT
