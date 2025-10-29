# @walkeros/storybook-addon

A Storybook addon that integrates walkerOS tagging support for data collection
and tracking validation. Visualize, debug, and validate walkerOS events in your
stories.

## Features

- 📊 **Events Tab**: View all detected walkerOS events with JSON syntax
  highlighting
- 🔴 **Live Events Tab**: Real-time event capture as you interact with
  components
- 🎯 **Visual Highlighting**: Toggle highlights for Context, Entity, Property,
  and Action attributes
- 🔄 **Auto-refresh**: Updates automatically when navigating stories or changing
  controls
- ⚙️ **Custom Prefix Support**: Configure custom data attribute prefixes
- 🚀 **Zero Configuration**: Works out of the box with walkerOS data attributes

## Compatibility

| Addon Version | Storybook Version | Status                      |
| ------------- | ----------------- | --------------------------- |
| ^0.2.x        | ^9.0.0            | ✅ Current (Active Support) |
| ^1.0.0        | ^10.0.0           | 📋 Planned                  |

> **Note:** Storybook 10 support is planned for v1.0.0. See
> [STORYBOOK_10_MIGRATION.md](./STORYBOOK_10_MIGRATION.md) for migration
> details.

## Installation

```bash
npm install --save-dev @walkeros/storybook-addon
```

```ts
// .storybook/main.ts
const config: StorybookConfig = {
  addons: ['@walkeros/storybook-addon'],
};
```

## Usage

### Basic Setup

1. **Install and register** the addon
2. **Add walkerOS tracking** to your components:

```tsx
import { tagger } from '../utils/tagger';

export const Button = ({ label, onClick }) => {
  const trackingProps = tagger('button').data({ label }).action('click').get();

  return (
    <button {...trackingProps} onClick={onClick}>
      {label}
    </button>
  );
};
```

3. **Use in stories**:

```ts
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

### Custom Prefix Configuration

Configure a custom prefix in your Storybook preview:

```ts
// .storybook/preview.ts
const preview: Preview = {
  parameters: {
    walkerOS: {
      prefix: 'data-elb',
      autoRefresh: true,
    },
  },
};
```

Update your tagger configuration to match:

```ts
// utils/tagger.ts
const taggerInstance = createTagger({
  prefix: 'data-elb',
});
```

## Addon Panels

### Events Tab

Shows all walkerOS events detected in the current story's DOM. Click "Update
events" to manually refresh.

### Live Events Tab

Captures events in real-time as you interact with components. Events are
automatically sent to the panel via the walker collector.

### Visual Highlighting

Use the highlight toggles to visually identify different types of walkerOS
attributes:

- **Context**: Yellow outline for context attributes
- **Entity**: Green outline for entity attributes
- **Property**: Red outline for property attributes
- **Action**: Purple outline for action attributes

## API Reference

```ts
import { DataElb, dataElbArgTypes } from '@walkeros/storybook-addon';
```

### `DataElb` Interface

```ts
interface DataElb {
  entity?: string;
  trigger?: string;
  action?: string;
  data?: WalkerOS.Properties;
  context?: WalkerOS.Properties;
  globals?: WalkerOS.Properties;
  link?: Record<string, string>;
}
```

### Story ArgTypes

```ts
export default {
  argTypes: {
    ...dataElbArgTypes,
    // Adds a walkerOS object control to your story
  },
};
```

## Configuration

| Option        | Type      | Default      | Description                                          |
| ------------- | --------- | ------------ | ---------------------------------------------------- |
| `prefix`      | `string`  | `'data-elb'` | Data attribute prefix (must match your walker setup) |
| `autoRefresh` | `boolean` | `true`       | Auto-refresh events on story/control changes         |

## Troubleshooting

### Events Not Showing

- Ensure components have walkerOS attributes: `data-elb`, `data-elb-*`, etc.
- Check prefix matches between addon config and tagger config
- Try manual refresh with "Update events" button

### Live Events Not Working

- Verify walker is properly initialized with matching prefix
- Check browser console for walker initialization errors
- Ensure components generate events when clicked/interacted with

### Highlighting Not Working

- Confirm prefix configuration matches in both addon and tagger
- Check that elements have the expected data attributes in DOM inspector

## License

MIT © [elbwalker GmbH](https://www.elbwalker.com)

## Links

- [walkerOS Documentation](https://docs.walkeros.com)
- [GitHub Repository](https://github.com/elbwalker/walkerOS)
