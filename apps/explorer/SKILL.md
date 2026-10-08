# Explorer Component Library

Entry point for working with the walkerOS explorer component library.

## Quick Reference

| Document               | Purpose                                                |
| ---------------------- | ------------------------------------------------------ |
| [AGENT.md](AGENT.md)   | Architecture, code standards, SCSS compliance          |
| [STYLE.md](STYLE.md)   | Design tokens in components, Monaco, SCSS architecture |
| [README.md](README.md) | Usage guidelines, component patterns                   |

## Design area

`design/` holds the walkerOS design system in the Claude Design artifact's file
layout. `design/tokens.json` is the only source of colour, type, spacing,
radius, container width, layer and motion values.

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
  `@walkeros/explorer/design/tailwind.css`, and constants from
  `@walkeros/explorer/design` for places CSS variables cannot reach (Monaco
  options, email HTML, a script-injected stub): colours, fonts, `motion`, `ease`
  and one object per type style (`typeProductMicro`, `typeCodeStep`:
  `{ size, lineHeight, weight, family, tracking? }`). Code that can read a CSS
  variable reads the variable instead.
- `tokens.css` declares `--motion` (180ms) and `--ease` and sets `--motion` to
  0ms under `prefers-reduced-motion`. `base.css` also stops animations,
  transitions with their own durations and smooth scrolling there.
  `tailwind.css` points Tailwind's `transition` utilities at `--motion` and
  `--ease` and declares the `container-*` widths (`max-w-md` and the rest) in
  px, so a page's root font size never re-sizes them.
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
  lints a consuming package. It prints `file:line:col rule match`; exit 1 means
  findings, exit 2 a misconfiguration. Its rules, by what they keep out:
  - Colour: `color-literal` (hex and colour functions), `named-color` (a colour
    keyword in a colour property), `palette-class`, `white-black-class`,
    `dark-variant` (`dark:`) and `color-scheme` (`prefers-color-scheme`).
  - Variables: `var-fallback` (a fallback on a design token) and
    `undeclared-var` (a variable no token and no file of the package declares).
  - Shape and layers: `shadow-class` (sized `shadow-*`, `drop-shadow`),
    `radius-class` (a radius off the design scale), `z-class` and `z-index` (a
    numeric layer).
  - Type: `text-size-class` rejects Tailwind's `text-xs` to `text-9xl` and a
    literal arbitrary size (`text-[10px]`); `text-<style>` and
    `text-[length:var(--type-<style>-size)]` pass. `font-literal` rejects a
    literal `font-size` or `font-family`, the `font` shorthand with either, and
    the same in style objects and JSX (`fontSize: 12`, `fontSize={10}`,
    `fontFamily="Inter"`). `var(--type-<style>-size)`,
    `calc(var(--type-<style>-size) * <k>)`,
    `clamp(<min>, <vw>, var(--type-<style>-size))` and `var(--font-*)` pass;
    `@font-face` is exempt.
  - Motion: `motion-class` rejects `duration-<n>`, `ease-in`, `ease-out`,
    `ease-in-out`, `ease-linear` and literal arbitrary values; `duration-0`,
    `delay-*` and `animate-*` pass. `motion-literal` rejects a literal time or
    easing in a `transition*` declaration or style object; `var(--motion)`,
    `var(--ease)`, a zero time and a delay in the shorthand pass. Keyframe
    animations keep their own timing.
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

### 4. Design Tokens Only

Never use hardcoded colours. Read the design tokens (no import needed: the page
loads `design/tokens.css`):

```scss
.elb-button {
  background: var(--primary);
  color: var(--on-primary);
  padding: 4px 8px;
  border-radius: var(--radius-xs);
  font-size: var(--type-product-small-size);
}
```

`npm run lint` runs `walkeros-design-check`, which fails on a colour literal, a
`var()` fallback on a token, a variable nothing declares, a literal font size or
family and a transition timing other than `var(--motion) var(--ease)` (the
rules: "Design area"). Design component partials follow the same tokens
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
│   ├── foundation/            # Reset, typography, layout, grid (no variables)
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
.elb-spinner {
  display: inline-block;
  border: 2px solid var(--border);
  border-top-color: var(--primary);
  border-radius: var(--radius-full);
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

## Design Tokens

Explorer declares no variables of its own: its components read the design tokens
from `design/tokens.css` (see "Design area"), resolved by the page's
`data-theme`. `.elb-explorer` is a layout root only. The ones components use
most:

```scss
--fg, --fg-2, --fg-3          // text: primary, secondary, meta
--bg, --bg-2                  // page ground, alternate band and headers
--surface, --surface-2        // boxes and menus, hover and inline code
--border, --border-strong     // hairlines, control and floating-layer edges
--primary, --on-primary, --link, --focus
--code-bg, --code-bar, --code-border, --code-fg   // code panels
--radius-xs                   // 4px, boxes and buttons
--type-product-body-size      // 14px; also -small, -caption, -micro (11px)
--z-dropdown                  // menus; also --z-raised, --z-popover, ...
```

Product components use the product type group (11 to 20px) and small radii,
sized for code boxes and menus rather than pages. Full guide:
[STYLE.md](STYLE.md).

## Checklist

Before merging new components:

- [ ] Component is fully controlled (no internal state for user data)
- [ ] Props interface exported with component
- [ ] BEM class naming: `.elb-{component}`
- [ ] SCSS reads design tokens only (`npm run lint` passes the checker)
- [ ] Story with `tags: ['autodocs']`
- [ ] SCSS imported in `index.scss`
- [ ] Component exported in `index.ts`
- [ ] Accessible (aria labels, roles, keyboard support)
- [ ] A state a colour tells also has a cue without colour (an icon, a glyph or
      an edge style) and its word
