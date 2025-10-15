# @walkeros/explorer

Interactive React components for walkerOS documentation and exploration.

## Installation

```bash
npm install @walkeros/explorer
```

## Usage

```tsx
import { LiveCode } from '@walkeros/explorer';
import '@walkeros/explorer/styles.css';

function App() {
  return (
    <LiveCode
      input={{ name: 'page view', data: { title: 'Home' } }}
      config={{ product: { view: { name: 'view_item' } } }}
      fn={async (input, config, log) => {
        // Your transformation logic
        log(input);
      }}
    />
  );
}
```

## Components

### LiveCode

An interactive code playground for demonstrating event transformations and
mappings.

**Props:**

- `input` - Initial input value (object or string)
- `config` - Optional configuration object
- `fn` - Transform function: `(input, config, log, options) => Promise<void>`
- `labelInput` - Label for input panel (default: "Event")
- `labelConfig` - Label for config panel (default: "Config")
- `labelOutput` - Label for output panel (default: "Result")
- `emptyText` - Text when no output (default: "No event yet.")
- `disableInput` - Disable input editing
- `disableConfig` - Disable config editing
- `showQuotes` - Show quotes around strings in output
- `className` - Additional CSS classes

## Styling

The package includes pre-built CSS with CSS variables for theming:

```css
:root {
  --explorer-bg: oklch(0.2 0 0);
  --explorer-fg: oklch(0.95 0 0);
  --explorer-border: oklch(0.3 0 0);
  --explorer-code-bg: oklch(0.18 0 0);
  --explorer-primary: oklch(0.6 0.2 250);
  --explorer-hover: oklch(0.25 0 0);
}
```

Override these variables to customize the theme.

## Development

```bash
# Build
npm run build

# Test
npm run test

# Watch mode
npm run dev
```

## License

MIT
