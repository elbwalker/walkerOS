# Explorer Component Library

Entry point for working with the walkerOS explorer component library.

## Quick Reference

| Document               | Purpose                                                       |
| ---------------------- | ------------------------------------------------------------- |
| [AGENT.md](AGENT.md)   | Architecture, code standards, SCSS compliance                 |
| [STYLE.md](STYLE.md)   | Complete CSS variable reference (colors, spacing, typography) |
| [README.md](README.md) | Usage guidelines, component patterns                          |

## Core Principles

### 1. Controlled Components Only

All UI state via props. No `useState` for user-visible state.

```tsx
// Correct: controlled
export function FormInput({ value, onChange, disabled }: Props) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
    />
  );
}

// Wrong: internal state
export function FormInput() {
  const [value, setValue] = useState(''); // NO
}
```

### 2. Atomic Design Hierarchy

```
atoms/      → Single elements (Button, Input, Spinner)
molecules/  → Compositions (FormCard, Dropdown)
organisms/  → Complex layouts (Header, Sidebar)
demos/      → Full page examples
```

### 3. BEM Naming

```scss
.elb-{component}           // Block
.elb-{component}__{element} // Element
.elb-{component}--{modifier} // Modifier

// Example
.elb-alert
.elb-alert__title
.elb-alert--error
```

### 4. CSS Variables Only

Never use hardcoded values. Import from theme:

```scss
@use '../../theme/variables' as *;

.elb-button {
  background: var(--color-button-primary);
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--radius-button);
  font-size: var(--font-size-base);
}
```

## File Structure

```
src/
├── components/
│   ├── atoms/
│   │   ├── button.tsx
│   │   ├── button.stories.tsx
│   │   └── ...
│   └── molecules/
│       ├── dropdown.tsx
│       └── ...
├── styles/
│   ├── theme/
│   │   └── _variables.scss    # All CSS variables
│   ├── components/
│   │   ├── atoms/
│   │   │   └── _button.scss
│   │   └── molecules/
│   │       └── _dropdown.scss
│   └── index.scss             # Import order matters
└── index.ts                   # Public exports
```

## Creating Components

### 1. Component File

```tsx
// src/components/atoms/spinner.tsx
import React from 'react';

export interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Spinner({ size = 'md', className }: SpinnerProps) {
  return (
    <span
      className={`elb-spinner elb-spinner--${size} ${className || ''}`}
      role="status"
      aria-label="Loading"
    />
  );
}
```

### 2. Story File

```tsx
// src/components/atoms/spinner.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { Spinner } from './spinner';

const meta: Meta<typeof Spinner> = {
  title: 'Atoms/Spinner',
  component: Spinner,
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof Spinner>;

export const Default: Story = {};

export const Small: Story = {
  args: { size: 'sm' },
};
```

### 3. SCSS File

```scss
// src/styles/components/atoms/_spinner.scss
@use '../../theme/variables' as *;

.elb-spinner {
  display: inline-block;
  border: 2px solid var(--border-box);
  border-top-color: var(--color-button-primary);
  border-radius: 50%;
  animation: elb-spin 0.6s linear infinite;

  &--sm {
    width: 1rem;
    height: 1rem;
  }
  &--md {
    width: 1.5rem;
    height: 1.5rem;
  }
  &--lg {
    width: 2rem;
    height: 2rem;
  }
}

@keyframes elb-spin {
  to {
    transform: rotate(360deg);
  }
}
```

### 4. Register SCSS

Add import to `src/styles/index.scss`:

```scss
// Atoms
@use 'components/atoms/spinner';
```

### 5. Export Component

Add to `src/index.ts`:

```tsx
export { Spinner } from './components/atoms/spinner';
export type { SpinnerProps } from './components/atoms/spinner';
```

## CSS Variables

Two scales live in this package. They cannot collide: they use different
selectors and different names.

### Tool scale (explorer components)

Scoped under `.elb-explorer`, never `:root`. Dark is
`[data-theme='dark'] .elb-explorer`. Names are **unprefixed**:

```scss
--color-text          // primary text
--color-text-muted    // secondary text
--bg-box              // main container background
--bg-header           // header background
--bg-input            // input field background
--border-box          // container border
--border-input-focus  // input border when focused
--color-button-primary
--radius-box
--spacing-md
--font-size-base      // 14px, tool scale
```

Full reference: [STYLE.md](STYLE.md). Sizes are tool scale: type 11-16px, radii
3-6px, sized for code boxes and dropdowns rather than pages.

### Site scale (Open Air page components)

Written to `:root`, prefixed `--oa-`, imported separately:

```scss
--oa-ground      --oa-surface     --oa-surface-2
--oa-ink         --oa-ink-2       --oa-ink-3
--oa-rule        --oa-flag
--oa-signal      --oa-signal-ink  --oa-signal-soft  --oa-glow  --oa-on-signal
--oa-shadow-sm   --oa-shadow-lg
--oa-sans        --oa-mono
--oa-r  --oa-r-lg  --oa-r-xl  --oa-r-pill
```

```tsx
import { SectionHead, LimitsBlock } from '@walkeros/explorer/site';
import '@walkeros/explorer/site.css'; // tokens + site components
import '@walkeros/explorer/tokens.css'; // tokens only
```

The prefix is not decoration: these land on the consumer's `:root`, and Tailwind
v4 defines `--shadow-sm` and `--shadow-lg` in `@theme default`, so an unprefixed
token would silently corrupt every `shadow-sm` utility in the consuming site.

**The rule people get wrong:** text on `--oa-signal` is always `--oa-on-signal`.
White on the brand blue is 2.4:1 and fails. On light grounds the blue appears as
text only via `--oa-signal-ink`.

## Checklist

Before merging new components:

- [ ] Component is fully controlled (no internal state for user data)
- [ ] Props interface exported with component
- [ ] BEM class naming: `.elb-{component}`
- [ ] SCSS uses only CSS variables
- [ ] Story with `tags: ['autodocs']`
- [ ] SCSS imported in `index.scss`
- [ ] Component exported in `index.ts`
- [ ] Accessible (aria labels, roles, keyboard support)
