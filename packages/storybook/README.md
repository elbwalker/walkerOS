# Storybook Addon walkerOS

A Storybook addon that integrates walkerOS tagging support for data collection.
This addon helps you visualize and debug data collection events in your
Storybook stories, making it easier to validate your tracking implementation.

## Features

- 🔍 **Event Visualization**: View all walkerOS events triggered by your stories
  in real-time
- 🔄 **Auto-refresh**: Automatically updates when navigating between stories or
  changing story controls
- 📊 **Detailed Event Information**: Inspect complete event data with syntax
  highlighting
- ⚙️ **Configurable Settings**: Customize the addon behavior with various
  configuration options
- 🎯 **Story-level Control**: Enable/disable tracking per story or globally

## Installation

First, install the package:

```sh
npm install --save-dev @walkerOS/storybook-addon
```

Then, register it as an addon in your Storybook configuration:

```ts
// .storybook/main.ts

import type { StorybookConfig } from '@storybook/your-framework';

const config: StorybookConfig = {
  // ...rest of config
  addons: [
    '@storybook/addon-docs',
    '@walkerOS/storybook-addon', // 👈 register the addon here
  ],
};

export default config;
```

## Usage

### Quick Start

1. Install and register the addon (see Installation above)
2. Add walkerOS data attributes to your components:
   ```tsx
   // Example React component
   export const Button = ({ label, ...props }) => (
     <button data-elb="button" data-elbaction="click" {...props}>
       {label}
     </button>
   );
   ```
3. View your story in Storybook - the addon panel will show detected events
4. Use the "Update events" button to refresh or configure settings in the Config
   tab

### Basic Usage

Once installed, the walkerOS addon will automatically appear in your Storybook
addon panel. It will display events as they are detected from your story
components.

### Story-level Configuration

You can configure the addon on a per-story basis using parameters:

```ts
// Button.stories.ts

import type { Meta, StoryObj } from '@storybook/your-framework';
import { Button } from './Button';

const meta: Meta<typeof Button> = {
  component: Button,
  parameters: {
    walkerOS: {
      autoRefresh: true,
      prefix: 'data-elb',
      // See API section below for all available parameters
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: {
    primary: true,
    label: 'Button',
  },
};
```

### Global Configuration

You can also configure the addon globally in your Storybook preview:

```ts
// .storybook/preview.ts

export const parameters = {
  walkerOS: {
    autoRefresh: true,
    prefix: 'data-elb',
  },
};
```

## API

### Parameters

This addon contributes the following parameters to Storybook, under the
`walkerOS` namespace:

#### `autoRefresh`

Type: `boolean`  
Default: `true`

Automatically refresh events when navigating between stories or changing story
controls. When disabled, you'll need to manually click the "Update events"
button to refresh the event list.

#### `prefix`

Type: `string`  
Default: `'data-elb'`

The data attribute prefix used by walkerOS for event tracking. This should match
your walkerOS configuration.

#### `disable`

Type: `boolean`  
Default: `false`

Disable the addon's behavior entirely. This parameter is useful for overriding
at more specific levels. For example, if set to `true` at the project level, it
can be re-enabled by setting it to `false` at the component or story level.

### Addon Configuration

When registering this addon, you can configure it with additional options:

```ts
// .storybook/main.ts

import type { StorybookConfig } from '@storybook/your-framework';

const config: StorybookConfig = {
  // ...rest of config
  addons: [
    '@storybook/addon-docs',
    {
      name: '@walkerOS/storybook-addon',
      options: {
        // Additional configuration options can be added here
      },
    },
  ],
};

export default config;
```

## How It Works

The addon works by:

1. **Event Detection**: Uses `getAllEvents` from `@elbwalker/walker.js` to scan
   your story's DOM for elements with walkerOS data attributes (like
   `data-elb="entity"`)
2. **Real-time Updates**: Automatically refreshes the event list when stories
   change or controls are updated
3. **Event Display**: Shows detailed information about each detected event
   including entity, action, and complete data payload
4. **Interactive UI**: Provides an expandable/collapsible list interface for
   easy event inspection
5. **No Setup Required**: Works without needing to initialize walkerOS - simply
   add data attributes to your components

## Supported Frameworks

This addon supports the following Storybook frameworks:

- React
- HTML
- Vue
- Angular

## Troubleshooting

### Events Not Showing

If events are not appearing in the addon panel:

1. Verify that your components have walkerOS data attributes (e.g.,
   `data-elb="button"`, `data-elbaction="click"`)
2. Check that the `prefix` parameter in the Config tab matches your data
   attributes (default: `data-elb`)
3. Ensure your components are rendered in the story (the addon scans the visible
   DOM)
4. Try manually refreshing events using the "Update events" button

## Contributing

Contributions are welcome! Please see the
[walkerOS repository](https://github.com/elbwalker/walkerOS) for contribution
guidelines.

## License

MIT © [elbwalker GmbH](https://www.elbwalker.com)

## Support

For support, please:

1. Check the [walkerOS documentation](https://docs.walkerOS.com)
2. Open an issue on the
   [walkerOS repository](https://github.com/elbwalker/walkerOS)
3. Contact us at hello@elbwalker.com
