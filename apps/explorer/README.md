# walkerOS Explorer

Interactive React components for walkerOS documentation and exploration.
Provides ready-to-use demo components with Monaco Editor integration for live
code editing and event visualization.

## Installation

```bash
npm install @walkeros/explorer
```

## Usage

```tsx
import { MappingDemo } from '@walkeros/explorer';
import '@walkeros/explorer/styles.css';
```

## Architecture

Components follow atomic design principles:

- **Atoms**: Basic UI elements (Box, Button, Header, ButtonGroup)
- **Molecules**: Simple combinations (CodeEditor, Preview)
- **Organisms**: Complex logic components (CodePanel, BrowserBox, CollectorBox,
  LiveCode)
- **Demos**: Ready-to-use complete demos (MappingDemo, DestinationDemo,
  PromotionPlayground)

## Components

### Demos (Ready-to-Use)

#### MappingDemo

Interactive three-panel editor: input → config → output transformation.

```tsx
<MappingDemo
  input='{"name": "example"}'
  config='{"transform": "uppercase"}'
  labelInput="Event"
  labelConfig="Rules"
  labelOutput="Result"
  fn={async (input, config) => {
    const data = JSON.parse(input);
    const rules = JSON.parse(config);
    return JSON.stringify(result, null, 2);
  }}
  theme="dark"
/>
```

#### DestinationDemo

Interactive destination testing with event processing and mapping.

```tsx
import { DestinationDemo, createGtagDestination } from '@walkeros/explorer';

const destination = createGtagDestination();
destination.env = { elb: (output) => console.log(output) };

<DestinationDemo
  destination={destination}
  event={{ name: 'order complete', data: { value: 99.99 } }}
  mapping={{ name: 'purchase', data: { map: { value: 'data.value' } } }}
  settings={{ measurementId: 'G-XXXXX' }}
  generic={true}
/>;
```

**Helper**: `createCaptureFn(fnName, onCapture)` for custom output capture.

#### PromotionPlayground

Interactive playground for walkerOS promotion events (used in documentation).

### Organisms

#### LiveCode

Generic live code execution with input/config/output panels.

```tsx
<LiveCode
  input={{ name: 'test event', data: {} }}
  config={{ mapping: 'rules' }}
  fn={async (input, config, log) => {
    log('Processing...', input);
  }}
  fnName="myFunction"
/>
```

#### CodePanel

Monaco editor with label and formatting controls.

```tsx
<CodePanel
  label="Configuration"
  value='{"key": "value"}'
  language="json"
  onChange={setValue}
  theme="dark"
/>
```

#### BrowserBox

Multi-tab code editor (HTML/CSS/JS) with live preview.

```tsx
<BrowserBox
  html="<div>Hello</div>"
  css="div { color: red; }"
  js="console.log('loaded')"
  onHtmlChange={setHtml}
  showPreview={true}
  initialTab="preview"
/>
```

#### CollectorBox

Displays collector processing with mapping and destination output.

```tsx
<CollectorBox
  event='{"name": "page view"}'
  mapping='{"page": {"view": {"name": "pageview"}}}'
  destination={destination}
/>
```

### Molecules

#### CodeEditor

Monaco Editor wrapper.

```tsx
<CodeEditor
  value="console.log('hello')"
  language="javascript"
  onChange={setValue}
/>
```

#### Preview

HTML preview in isolated iframe with walkerOS event capture.

```tsx
<Preview
  html="<div data-elb='product'>Item</div>"
  css="div { padding: 20px; }"
  onEvent={(event) => console.log(event)}
/>
```

### Atoms

#### Box, Header, Button, ButtonGroup

Basic UI building blocks. See exported types for prop details.

### Helpers

#### Destination Creators

```tsx
import {
  createGtagDestination,
  createFbqDestination,
  createPlausibleDestination,
} from '@walkeros/explorer';

const gtag = createGtagDestination();
gtag.env = { elb: (output) => console.log(output) };
```

## Styling

```tsx
import '@walkeros/explorer/styles.css';
```

### CSS Variables

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

## Development

```bash
npm install        # Install dependencies
npm run start      # Start Vite dev server
npm test           # Run tests
npm run build      # Build package
npm run lint       # Lint code
```

## Browser Support

Chrome 80+, Firefox 75+, Safari 13+, Edge 80+

## License

MIT
