# Pane Layout Standards

## DRY Principle: Single Source of Truth

**ALL padding and scrolling is handled by the pane wrapper, NOT by content
components.**

## Standard Pattern

### For Simple Content Panes

```tsx
// Component structure
<div className="elb-mapping-pane">
  <div className="elb-mapping-pane-content">
    {/* Your content components here - NO padding/margin on root */}
    <YourContentComponent />
  </div>
</div>
```

```scss
// Content component styles - NO root padding/margin
.your-content-component {
  // NO padding here!
  // NO margin here (except between sibling elements)!

  &-header {
    margin-bottom: 16px; // Internal spacing OK
  }

  & + & {
    margin-top: 32px; // Spacing between siblings OK
  }
}
```

### What `.elb-mapping-pane-content` Provides

From `_mapping-panes.scss:280-286`:

```scss
.elb-mapping-pane-content {
  flex: 1;
  min-height: 0;
  overflow-y: auto; // ← Scrolling
  padding: var(--spacing-grid-gap); // ← 16px padding (all sides)
  padding-bottom: 50vh; // ← Extra bottom for scroll comfort
}
```

## Rules

### ✅ DO

- Let `.elb-mapping-pane-content` handle ALL padding
- Let `.elb-mapping-pane-content` handle ALL scrolling
- Use margin for spacing between sibling elements: `& + &`
- Use internal margins for component structure (header, sections, etc.)

### ❌ DON'T

- Add `padding` to the root of content components
- Add `margin-bottom` to the last element thinking it needs spacing
- Create custom scrolling containers inside content components
- Duplicate the padding that the wrapper provides

## Examples

### ✅ CORRECT - Rule Section

```scss
.elb-mapping-rule-section {
  // NO padding/margin on root!

  & + & {
    margin-top: 32px; // Only between sections
  }

  &-header {
    margin-bottom: 16px; // Internal structure
  }

  &-grid {
    display: grid;
    gap: 16px; // Internal grid spacing
  }
}
```

### ❌ WRONG - Don't Do This

```scss
.elb-mapping-rule-section {
  padding: 24px; // ← NO! Parent provides this
  margin-bottom: 32px; // ← NO! Only use margin between siblings
}
```

### ✅ CORRECT - Type Grid

```scss
.elb-mapping-type-grid {
  // NO padding on root!

  &-title {
    margin-bottom: 16px;
  }

  &-container {
    display: grid;
    gap: 16px;
  }
}
```

### ❌ WRONG - Type Grid (Old Way)

```scss
.elb-mapping-type-grid {
  padding: 24px; // ← NO! Creates double padding
}
```

## Special Cases

### Complex Layouts with Headers

For panes with fixed headers + scrollable content (like EntityPane,
OverviewPane):

```tsx
<div className="elb-mapping-entity-pane">
  {' '}
  {/* Custom wrapper */}
  <div className="elb-mapping-entity-pane-header">{/* Fixed header */}</div>
  <div className="elb-mapping-entity-pane-content">
    {/* Scrollable content - has its own padding */}
  </div>
</div>
```

These use their own wrapper patterns but still follow the principle:

- **One scrollable area** with padding
- **Content components** inside have no root padding

## Benefits

1. **Consistency** - All panes have the same padding and scroll behavior
2. **DRY** - Change padding in ONE place (`--spacing-grid-gap`)
3. **Maintainability** - No guessing about spacing
4. **No Conflicts** - No double padding issues
5. **Easy Testing** - Predictable layout behavior

## Quick Checklist

When creating a new content component:

- [ ] Does the root element have `padding`? → Remove it
- [ ] Does the root element have `margin-bottom`? → Remove it (use `& + &`
      instead)
- [ ] Is there a scrollable container? → Remove it (parent handles scrolling)
- [ ] Are you wrapping in `.elb-mapping-pane` + `.elb-mapping-pane-content`? →
      Yes!
