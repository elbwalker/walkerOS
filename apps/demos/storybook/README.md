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
# Clone and navigate to the demo
git clone https://github.com/elbwalker/walkerOS.git
cd walkerOS/apps/demos/storybook

# Install dependencies and start
npm install
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

This demo includes examples of:

- **Simple Components**: Basic buttons with tracking
- **Complex Components**: Hero banners with nested data
- **Template Components**: Full page layouts with contextual tracking
- **Different Patterns**: Various approaches to component tracking

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
