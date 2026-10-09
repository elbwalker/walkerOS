# Pane Layout Standards

## One wrapper owns padding and scrolling

In a pane that scrolls, the pane's content wrapper owns ALL padding and
scrolling. The components inside it carry no root padding and no scroll
container of their own.

## Standard Pattern

```tsx
<div className="elb-{pane}">
  <div className="elb-{pane}__content">
    {/* Content components: no root padding or margin */}
    <YourContentComponent />
  </div>
</div>
```

```scss
// The pane's content wrapper: the one place for padding and scrolling
.elb-{pane}__content {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 16px;
}

// A content component inside it
.elb-{component} {
  // No padding and no margin on the root

  & + & {
    margin-top: 32px; // Spacing between siblings
  }

  &__header {
    margin-bottom: 16px; // Internal structure
  }

  &__grid {
    display: grid;
    gap: 16px; // Internal grid spacing
  }
}
```

## Rules

### ✅ DO

- Let the pane's content wrapper handle ALL padding and ALL scrolling
- Use margin for spacing between sibling elements: `& + &`
- Use internal margins for component structure (header, sections)

### ❌ DON'T

- Add `padding` to the root of a content component
- Add `margin-bottom` to the last element thinking it needs spacing
- Create a scrolling container inside a content component
- Repeat the padding the wrapper provides

### ❌ WRONG

```scss
.elb-{component} {
  padding: 24px; // The wrapper provides this: double padding
  margin-bottom: 32px; // Only use margin between siblings
}
```

## Panes with a fixed header

A pane with a fixed header and a scrolling body keeps the same rule: the header
sits outside the content wrapper, and the content wrapper is the one scrolling
area with padding.

```tsx
<div className="elb-{pane}">
  <div className="elb-{pane}__header">{/* Fixed header */}</div>
  <div className="elb-{pane}__content">{/* The one scrolling area */}</div>
</div>
```

Explorer's `Box` is not such a pane: `.elb-explorer-content` fills the box and
clips (`overflow: hidden`), and the editor inside it scrolls itself.

## Quick Checklist

When creating a new content component:

- [ ] Does the root element have `padding`? Remove it
- [ ] Does the root element have `margin-bottom`? Remove it (use `& + &`
      instead)
- [ ] Is there a scrolling container? Remove it (the wrapper scrolls)
- [ ] Does it sit inside the pane's content wrapper? It should
