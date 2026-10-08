# walkerOS Storybook Demo

A lean demonstration of the **walkerOS Storybook addon** that helps developers
visualize and debug event tracking in React components.

## Why Use the walkerOS Storybook Addon?

- **Validate Implementation**: Ensure tracking works correctly before deployment
- **Component Development**: Build tracking directly into your component library
- **Team Collaboration**: Share tracking specifications with stakeholders using
  Storybook
- **Debug Tracking**: See walkerOS events in real-time as you interact with
  components

## Quick Start

```bash
# Clone and install the monorepo
git clone https://github.com/elbwalker/walkerOS.git
cd walkerOS
npm install

# Build the demo's dependencies, explorer's design CSS among them
npx turbo run build --filter=@walkeros/storybook-demo...

# Start Storybook
cd apps/demos/storybook
npm run storybook
```

Visit `http://localhost:6006` and check the **walkerOS** addon panel to see live
tracking events.

## How It Works

### 1. Add the Addon to Your Storybook

```bash
npm install @walkeros/storybook-addon
```

Add to your `.storybook/main.ts`:

```typescript
export default {
  addons: ['@walkeros/storybook-addon'],
};
```

### 2. Create Components with walkerOS Tracking (optional)

Add tracking to your components using the `dataElb` prop pattern:

```tsx
import { createTrackingProps, type DataElb } from '../utils/tagger';

interface ButtonProps {
  label: string;
  dataElb?: DataElb; // Add walkerOS tracking prop
}

export const Button = ({ label, dataElb }: ButtonProps) => {
  // The tagger converts walkerOS config to HTML data attributes
  const trackingProps = createTrackingProps(dataElb);

  return <button {...trackingProps}>{label}</button>;
};
```

The **tagger utility** automatically converts your tracking configuration into
the proper `data-elb*` attributes that walkerOS needs, while keeping your
component code clean.

### 3. Configure Storybook Controls

Add `dataElb` controls to your stories:

```typescript
export default {
  component: Button,
  argTypes: {
    dataElb: {
      control: { type: 'object' },
      description: 'walkerOS tracking configuration',
    },
  },
};

export const Primary = {
  args: {
    label: 'Click me',
    dataElb: {
      entity: 'cta_button',
      action: 'click',
      data: { campaign: 'hero' },
    },
  },
};
```

### 4. Debug in Storybook

1. Open any story with walkerOS tracking
2. Navigate to the **walkerOS** addon panel
3. Interact with components to see live events
4. Inspect event data structure and validate tracking

## Demo Components

Two example component libraries, each built with atomic design (atoms,
molecules, organisms, templates, pages) and tagged through the typed tagger in
`src/utils/tagger.ts`:

- **Media** (`src/components/media`, stories under `Media/*`): a streaming site
  with a header, hero banner, content carousels and a promotion banner.
- **Shop** (`src/components/shop`, stories under `Shop/*`): the
  [static tagging demo](../tagging/) rebuilt as components. Header globals,
  promotion, recommendations (with `data-elbobserve` and "Add product"), product
  detail, checkout, order complete, footer and a consent bar carry the same tags
  as the static page. `Shop/Pages/Tagging demo` shows every section on one page;
  its consent bar sends the static demo's `walker user` and `walker consent`
  commands to the addon's collector.

[story.md](./story.md) lists every component of both libraries.

## Design System

Both libraries are styled only from the walkerOS design system, which lives in
`@walkeros/explorer` (a dependency of this package). `src/index.css` imports
`@walkeros/explorer/design/tailwind.css` and
`@walkeros/explorer/design/base.css`, and the Storybook toolbar switches between
the dark (default) and the light theme. `npm run lint` runs
`walkeros-design-check` over `src` and `.storybook`.

The design CSS is read from explorer's built `dist`. In a fresh clone, build it
before `npm run storybook`, `npm run build-storybook` or `npm run build`: run
`npx turbo run build --filter=@walkeros/storybook-demo...` from the repository
root (or build `apps/explorer`). A job that builds this Storybook does the same.
A standalone `npm install` of this package, outside the monorepo, needs an
`@walkeros/explorer` release that ships the design exports.

## Key Features

- **Real-time Events**: See tracking fire as you interact with components
- **Event Inspector**: Detailed JSON view of all event properties
- **Auto-refresh**: Events update automatically when you change component props
- **Clean Integration**: Use modern React patterns with the `dataElb` prop

## Useful Commands

```bash
npm run storybook        # Start development server
npm run build-storybook  # Build static version
npm run build           # Build demo components
```

## Learn More

- [walkerOS Documentation](https://www.walkeros.io/docs)
- [Storybook Addon Source](../../../storybook-addon/)
- [walkerOS GitHub](https://github.com/elbwalker/walkerOS)
