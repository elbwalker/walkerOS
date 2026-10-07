# Explorer Component Library

Entry point for working with the walkerOS explorer component library.

## Quick Reference

| Document               | Purpose                                                       |
| ---------------------- | ------------------------------------------------------------- |
| [AGENT.md](AGENT.md)   | Architecture, code standards, SCSS compliance                 |
| [STYLE.md](STYLE.md)   | Complete CSS variable reference (colors, spacing, typography) |
| [README.md](README.md) | Usage guidelines, component patterns                          |

## Design area

`design/` holds the walkerOS design system in the Claude Design artifact's file
layout. `design/tokens.json` is the only source of colour, type, spacing, radius
and layer values.

- Change a token in `design/tokens.json` only. The explorer build parses it
  (`src/design/tokens.ts`; a malformed token fails the build with its JSON
  path), regenerates `src/design/index.ts` and writes `dist/design/tokens.css`,
  `tailwind.css` and `base.css`. Never edit generated files.
- If the drift test in `src/design/__tests__/generate.test.ts` reports a stale
  `src/design/index.ts`, run `npm run build` in `apps/explorer`. A turbo cache
  hit restores `dist/` without running the generator, so a turbo build does not
  refresh it.
- Every new or changed colour passes `src/design/__tests__/contrast.test.ts` in
  both themes. The test fails for a colour that is in no contrast row and not on
  its `UNPAIRED` list, which names the reason for each colour left out.
- Exports: `@walkeros/explorer/design/tokens.css`,
  `@walkeros/explorer/design/base.css`,
  `@walkeros/explorer/design/tailwind.css`, and colour and font constants from
  `@walkeros/explorer/design` for engines that cannot read CSS variables.
- A Tailwind `text-<style>` class from `tailwind.css` sets size, line height,
  weight and tracking, not the style's font family. Pair it with `font-<family>`
  (`font-mono`, `font-viz`, `font-viz-mono`) when the style's family is not
  `sans`.
- Component CSS reads type from `tokens.css`, never a hard-coded size or weight:
  every style declares `--type-<style>-size`, `-line-height`, `-weight`,
  `-family` and, when the style sets one, `-tracking` (token names starting with
  `type-` are reserved). A fluid display heading composes them:
  `.hero h1 { font-size: clamp(38px, 6vw, var(--type-display-size)); font-weight: var(--type-display-weight); }`.
- `walkeros-design-check [--allow [<rule>:]<glob>]... [--allow-var <prefix>]... <path>...`
  lints a consuming package for colour literals, palette and `dark:` classes,
  `var()` fallbacks on design tokens and undeclared variables. Exit 1 means
  findings, exit 2 a misconfiguration.
- The checker cannot tell a bare `shadow` or `font-serif` class from prose, so
  it does not flag them. Both render nothing once `tailwind.css` resets
  Tailwind's shadows and fonts; use the design shadow and font classes instead.
- Importing `tokens.css` alone into a Tailwind page re-scales Tailwind's
  `rounded-*` (`--radius-*` share Tailwind's names; `rounded-lg` becomes 12px)
  and re-fonts `font-sans` and `font-mono`. Move radius classes to the design
  scale in the same change.
- Keep `design/` in the artifact's format and out of prettier: Claude Design
  syncs it from the repo.

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

Design components (`src/design/components/`) are page building blocks, not form
controls: they may keep presentation state such as a copy confirmation or the
step a demo shows.

### 2. Atomic Design Hierarchy

```
atoms/      → Single elements (Button, Input, Spinner)
molecules/  → Compositions (FormCard, Dropdown)
organisms/  → Complex layouts (Header, Sidebar)
demos/      → Full page examples
```

The design components use the same order with a `layout/` level for page
structure and `viz/` for the demos: `atoms/`, `molecules/`, `layout/`, `viz/`
(AGENT.md, "Design components").

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

Design component partials take the design tokens instead of the theme variables
(STYLE.md, "Design component styles").

## File Structure

```text
src/
├── components/                # Product components (CodeBox, FlowMap, ...)
│   ├── atoms/
│   │   ├── button.tsx
│   │   ├── button.stories.tsx
│   │   └── ...
│   └── molecules/
│       ├── code-box.tsx
│       └── ...
├── design/
│   └── components/            # @walkeros/explorer/design/components (React only)
│       ├── index.ts           # Re-exports the four folders
│       ├── atoms/  molecules/  layout/  viz/   # Each with its own index.ts
│       └── viz/parts/  viz/data/              # Internal demo parts and data
├── styles/
│   ├── theme/
│   │   └── _variables.scss    # All CSS variables
│   ├── components/
│   │   ├── atoms/
│   │   │   └── _button.scss
│   │   ├── molecules/
│   │   │   └── _code-box.scss
│   │   └── design/            # One partial per design component
│   └── index.scss             # Import order matters
└── index.ts                   # Public exports
```

## Creating Components

The steps below are for product components in `src/components/`. A design
component follows AGENT.md "Design components" and STYLE.md "Design component
styles": its folder's `index.ts`, one partial in `src/styles/components/design/`
added to that folder's aggregator, a `Design/...` story and a pass-through test.

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
--font-size-base      // 14px
```

Full reference: [STYLE.md](STYLE.md). Sizes: type 11-16px, radii 3-6px, sized
for code boxes and dropdowns rather than pages.

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
