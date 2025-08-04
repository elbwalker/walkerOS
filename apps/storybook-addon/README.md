# @walkeros/storybook-addon

A Storybook addon that integrates walkerOS tagging support for data collection
and tracking validation. This addon helps you visualize and debug walkerOS
events in your Storybook stories, making it easier to validate your tracking
implementation during development.

## Features

- 🔍 **Event Visualization**: View all walkerOS events detected in your stories
  in real-time
- 🔄 **Auto-refresh**: Automatically updates when navigating between stories or
  changing story controls
- 📊 **Detailed Event Information**: Inspect complete event data with JSON
  syntax highlighting
- ⚙️ **Configurable Settings**: Customize prefix and auto-refresh behavior
- 🎯 **Story Arguments**: Pre-built arg types for walkerOS tagging attributes
- 🚀 **Zero Configuration**: Works out of the box with walkerOS data attributes

## Installation

Install the addon in your Storybook project:

```bash
npm install --save-dev @walkeros/storybook-addon
```

Then register it in your Storybook configuration:

```ts
// .storybook/main.ts
import type { StorybookConfig } from '@storybook/react'; // or your framework

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(js|jsx|ts|tsx|mdx)'],
  addons: [
    '@storybook/addon-docs',
    '@walkeros/storybook-addon', // 👈 Add the walkerOS addon
  ],
  framework: {
    name: '@storybook/react', // or your framework
    options: {},
  },
};

export default config;
```

## Usage

### Quick Start

1. **Install and register** the addon (see Installation above)

2. **Add walkerOS tracking** to your components using the `dataElb` prop
   pattern:

   ```tsx
   import { createTrackingProps, type DataElb } from '../utils/tagger';

   interface ButtonProps {
     label: string;
     dataElb?: DataElb;
   }

   export const Button = ({ label, dataElb }: ButtonProps) => {
     const trackingProps = createTrackingProps(dataElb);
     return <button {...trackingProps}>{label}</button>;
   };
   ```

3. **View your story** - the walkerOS addon panel will automatically appear and
   show detected events

4. **Configure as needed** using the addon's Config tab or story parameters

### Configure Storybook Controls

Add `dataElb` controls to your stories for easy tracking configuration:

```ts
// Button.stories.ts
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './Button';

const meta: Meta<typeof Button> = {
  title: 'Example/Button',
  component: Button,
  argTypes: {
    dataElb: {
      control: { type: 'object' },
      description: 'walkerOS tracking configuration',
    },
    // ... your other arg types
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: {
    label: 'Button',
    dataElb: {
      entity: 'button',
      action: 'click',
      data: { category: 'primary' },
    },
  },
};
```

### Configuration

The addon works with default settings out of the box, but you can customize its
behavior:

#### Global Configuration

Configure the addon globally in your Storybook preview:

```ts
// .storybook/preview.ts
import type { Preview } from '@storybook/react';

const preview: Preview = {
  parameters: {
    // The addon automatically registers its own global configuration
    // You can override defaults here if needed
  },
};

export default preview;
```

#### Runtime Configuration

Use the addon's **Config tab** in the Storybook panel to adjust settings:

- **Auto-refresh**: Toggle automatic event updates
- **Prefix**: Change the data attribute prefix (default: `data-elb`)

These settings are saved and will persist across browser sessions.

## API Reference

### Exports

The addon exports the following types:

```ts
import {
  DataElb, // TypeScript interface for dataElb prop
} from '@walkeros/storybook-addon';
```

### `DataElb` Interface

TypeScript interface for the tracking prop pattern:

```ts
interface DataElb {
  entity?: string;
  trigger?: string;
  action?: string;
  data?: WalkerOS.Properties; // Rich data objects
  context?: WalkerOS.Properties; // Context information
  globals?: WalkerOS.Properties; // Global properties
  link?: Record<string, string>; // Link relationships
}
```

### Addon Configuration

The addon provides these configuration options (accessible via the Config tab):

#### `autoRefresh`

- **Type**: `boolean`
- **Default**: `true`
- **Description**: Automatically refresh events when navigating between stories
  or changing controls

#### `prefix`

- **Type**: `string`
- **Default**: `'data-elb'`
- **Description**: Data attribute prefix used by walkerOS (must match your
  walkerOS setup)

## How It Works

The addon works by:

1. **Event Detection**: Uses `getAllEvents` from `@walkeros/web-source-browser`
   to scan your story's DOM for walkerOS data attributes
2. **Real-time Updates**: Automatically refreshes when stories change or
   controls are updated
3. **Event Display**: Shows detailed information about each detected event with
   JSON syntax highlighting
4. **Interactive UI**: Provides an expandable list interface for easy event
   inspection
5. **Zero Configuration**: Works without initializing walkerOS - just add the
   `dataElb` prop to your components

## Supported Frameworks

This addon works with any Storybook framework:

- React
- Vue
- Angular
- Web Components
- HTML
- Svelte

## Troubleshooting

### Events Not Showing

If events are not appearing in the addon panel:

1. **Check tracking implementation**: Ensure your components use the `dataElb`
   prop:

   ```tsx
   <Button label="Click me" dataElb={{ entity: 'button', action: 'click' }} />
   ```

2. **Verify prefix**: Check that the prefix in the Config tab matches your
   attributes (default: `data-elb`)

3. **Check rendering**: Ensure your components are actually rendered in the
   story DOM

4. **Manual refresh**: Try clicking "Update events" button in the addon panel

5. **Console errors**: Check browser console for any JavaScript errors

### Common Issues

- **Empty event list**: Components may not have walkerOS attributes or the
  prefix doesn't match
- **Outdated events**: Try disabling and re-enabling auto-refresh, or manually
  refresh
- **Missing addon panel**: Ensure the addon is properly registered in
  `.storybook/main.ts`

## Development

This addon is part of the
[walkerOS monorepo](https://github.com/elbwalker/walkerOS).

To contribute:

1. Clone the walkerOS repository
2. Run `npm install` in the root
3. Make changes in `apps/storybook-addon/`
4. Test with the demo in `apps/demos/storybook/`

## License

MIT © [elbwalker GmbH](https://www.elbwalker.com)

## Links

- [walkerOS Documentation](https://docs.walkeros.com)
- [GitHub Repository](https://github.com/elbwalker/walkerOS)
- [walkerOS Website](https://www.walkeros.com)
