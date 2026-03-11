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
  background: var(--elb-color-primary);
  padding: var(--elb-spacing-sm) var(--elb-spacing-md);
  border-radius: var(--elb-radius-md);
  font-size: var(--elb-font-size-base);
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
  border: 2px solid var(--elb-color-border);
  border-top-color: var(--elb-color-primary);
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

## Common CSS Variables

### Colors

```scss
--elb-color-primary        // Brand blue
--elb-color-success        // Green for success states
--elb-color-warning        // Yellow/orange for warnings
--elb-color-error          // Red for errors
--elb-color-text           // Main text color
--elb-color-text-muted     // Secondary text
--elb-color-bg             // Background
--elb-color-bg-secondary   // Subtle backgrounds
--elb-color-border         // Default borders
```

### Spacing

```scss
--elb-spacing-xs: 0.25rem // 4px
  --elb-spacing-sm: 0.5rem // 8px
  --elb-spacing-md: 1rem // 16px
  --elb-spacing-lg: 1.5rem // 24px
  --elb-spacing-xl: 2rem; // 32px
```

### Typography

```scss
--elb-font-size-xs: 0.75rem // 12px
  --elb-font-size-sm: 0.875rem // 14px
  --elb-font-size-base: 1rem // 16px
  --elb-font-size-lg: 1.125rem // 18px
  --elb-font-size-xl: 1.25rem; // 20px
```

### Borders & Shadows

```scss
--elb-radius-sm: 0.25rem --elb-radius-md: 0.5rem --elb-radius-lg: 0.75rem
  --elb-shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05) --elb-shadow-md: 0 4px 6px
  rgba(0, 0, 0, 0.1);
```

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
