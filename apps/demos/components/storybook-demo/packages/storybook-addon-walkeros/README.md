# @walkeros/storybook-addon

A Storybook addon for integrating walkerOS event tracking and debugging into your Storybook development workflow.

## Features

- 🎯 **Enable/Disable Tracking**: Toggle walkerOS tracking via Storybook toolbar
- 📊 **Event Panel**: View tracked events in a dedicated panel alongside Controls and Actions
- 🔍 **Interactive JSON**: Expandable event objects with formatted display
- 🚀 **Zero Configuration**: Works out of the box with minimal setup

## Installation

```bash
npm install @walkeros/storybook-addon
```

## Usage

Add the addon to your `.storybook/main.ts`:

```typescript
import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  addons: [
    // ... other addons
    '@walkeros/storybook-addon',
  ],
};

export default config;
```

## How to Use

1. **Enable Tracking**: Click the "walkerOS" dropdown in the Storybook toolbar and select "Enabled"
2. **View Events**: Navigate to the "walkerOS events" tab in the addons panel (next to Controls, Actions)
3. **Debug Events**: Click on event objects to expand and inspect their structure

## Development

This addon is designed for smooth development:
- No build step required during development
- Always uses current source implementation
- Hot reloading support

## API

### Toolbar Control
- **walkerOS Dropdown**: Enable/disable tracking globally
- **Persistent State**: Settings maintained across story navigation

### Events Panel
- **Event Display**: Interactive JSON viewer for event objects
- **Real-time Updates**: Events appear as they're tracked
- **Expandable Objects**: Click to explore nested data structures

## Configuration

The addon works with minimal configuration. For advanced use cases, you can customize:

```typescript
// Future configuration options will be available here
```

## Contributing

This addon is part of the walkerOS ecosystem. For contributions and issues:
- GitHub: https://github.com/walkeros/walkeros
- Documentation: https://docs.walkeros.com

## License

MIT