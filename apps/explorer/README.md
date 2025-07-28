# WalkerOS Explorer

Interactive code editor and preview components for walkerOS development,
testing, and debugging. Built with functional factory patterns, zero external
dependencies, and comprehensive TypeScript support.

## 🎯 Overview

WalkerOS Explorer is a complete toolkit for building interactive development
environments. It provides a set of composable components that can be used
individually or combined to create powerful code editing and preview
experiences.

### ✨ Key Features

- 🧩 **Functional Factory Pattern** - Clean, composable component architecture
- 🚀 **Zero Dependencies** - No external libraries except for React peer
  dependencies
- 💎 **Full TypeScript Support** - Complete type definitions and IntelliSense
- 🎨 **Theme-aware** - Built-in light/dark theme support
- 📱 **Responsive Design** - Works on all screen sizes
- ⚡ **High Performance** - Optimized for speed and memory efficiency
- 🧪 **Fully Tested** - 101 comprehensive tests with Jest and JSDOM

## 📦 Installation

```bash
# In walkerOS monorepo (already included)
npm install

# As external dependency (future)
npm install @walkeros/explorer
```

## 🏗️ Architecture

The explorer is built in phases, each building upon the previous:

### Phase 1: Foundation

- **Component Factory** - Base component system with lifecycle management
- **Event Bus** - Global communication system
- **DOM Utilities** - Safe DOM manipulation and event handling
- **Performance Utilities** - Debounce, throttle, and memoization
- **Syntax Highlighting** - Code syntax detection and highlighting

### Phase 2: Individual Components

- **CodeEditor** - Interactive code editor with syntax highlighting
- **Preview** - HTML preview with iframe sandboxing
- **ResultDisplay** - Execution results with multiple result types

### Phase 3: Composite Components

- **LiveCode** - Combined editor and preview for live development
- **EventFlow** - walkerOS event visualization and debugging
- **Destination** - walkerOS destination testing and configuration

## 🚀 Quick Start

### Individual Components

```typescript
import {
  createCodeEditor,
  createPreview,
  createResultDisplay,
} from '@walkeros/explorer';

// Create a code editor
const editor = createCodeEditor('#editor', {
  language: 'javascript',
  value: 'console.log("Hello World");',
  height: '400px',
  onChange: (value) => console.log('Code changed:', value),
});

// Create a preview
const preview = createPreview('#preview', {
  html: '<h1>Hello World</h1>',
  height: '400px',
});

// Create a results display
const results = createResultDisplay('#results', {
  maxResults: 100,
});
```

### Composite Components

```typescript
import {
  createLiveCode,
  createEventFlow,
  createDestination,
} from '@walkeros/explorer';

// Live code editor with preview
const liveCode = createLiveCode('#livecode', {
  layout: 'horizontal',
  showTabs: true,
  initialHTML: '<h1>Hello World</h1>',
  initialCSS: 'h1 { color: blue; }',
  initialJS: 'console.log("Hello");',
});

// Event flow visualization
const eventFlow = createEventFlow('#events', {
  maxEvents: 1000,
  showMetrics: true,
  onEventCapture: (event) => console.log('Event:', event),
});

// Destination testing
const destination = createDestination('#destination', {
  showTemplates: true,
  enableValidation: true,
});
```

## 📚 Components Reference

### CodeEditor

Interactive code editor with syntax highlighting and multiple language support.

```typescript
const editor = createCodeEditor(elementOrSelector, {
  language: 'javascript' | 'typescript' | 'html' | 'css' | 'json' | 'markdown',
  value: string,
  height: string,
  readOnly: boolean,
  onChange: (value: string, language: string) => void
});

// API Methods
editor.getValue()           // Get current code
editor.setValue(code)       // Set code content
editor.getLanguage()        // Get current language
editor.setLanguage(lang)    // Set programming language
editor.focus()              // Focus the editor
editor.selectAll()          // Select all content
editor.insertText(text)     // Insert text at cursor
```

### Preview

HTML preview component with iframe sandboxing and error handling.

```typescript
const preview = createPreview(elementOrSelector, {
  html: string,
  height: string,
  sandbox: boolean,
  showErrors: boolean,
  onLoad: (iframe) => void,
  onError: (error) => void
});

// API Methods
preview.setHTML(html)                    // Set HTML content
preview.getHTML()                        // Get current HTML
preview.refresh()                        // Refresh preview
preview.executeScript(script)            // Execute script in preview
preview.injectCSS(css)                   // Inject CSS into preview
```

### ResultDisplay

Display execution results with multiple result types and formatting.

```typescript
const results = createResultDisplay(elementOrSelector, {
  maxResults: number,
  height: string,
  autoScroll: boolean
});

// API Methods
results.addValue(value, label?)          // Add value result
results.addError(error, label?)          // Add error result
results.addLog(message, label?)          // Add log result
results.addWarning(message, label?)      // Add warning result
results.addInfo(message, label?)         // Add info result
results.clear()                          // Clear all results
results.getResults()                     // Get all results
```

### LiveCode

Combined code editor and preview for live HTML/CSS/JS development.

```typescript
const liveCode = createLiveCode(elementOrSelector, {
  layout: 'horizontal' | 'vertical' | 'tabs',
  showTabs: boolean,
  showResults: boolean,
  autoRun: boolean,
  initialHTML: string,
  initialCSS: string,
  initialJS: string,
  enableConsoleCapture: boolean,
  onRun: (code) => void
});

// API Methods
liveCode.getHTML()                       // Get HTML content
liveCode.setHTML(html)                   // Set HTML content
liveCode.getCSS()                        // Get CSS content
liveCode.setCSS(css)                     // Set CSS content
liveCode.getJS()                         // Get JavaScript content
liveCode.setJS(js)                       // Set JavaScript content
liveCode.run()                           // Execute code manually
liveCode.clear()                         // Clear all editors
liveCode.setLayout(layout)               // Change layout
```

### EventFlow

WalkerOS event visualization and debugging component.

```typescript
const eventFlow = createEventFlow(elementOrSelector, {
  maxEvents: number,
  showTimeline: boolean,
  showFilters: boolean,
  showMetrics: boolean,
  groupByEntity: boolean,
  onEventCapture: (event) => void,
  onEventSelect: (event) => void
});

// API Methods
eventFlow.addEvent(event)                // Add new event
eventFlow.getEvents()                    // Get all events
eventFlow.clearEvents()                  // Clear all events
eventFlow.filterEvents(filter)           // Filter events
eventFlow.exportEvents()                 // Export filtered events
eventFlow.getMetrics()                   // Get performance metrics
```

### Destination

WalkerOS destination testing and configuration component.

```typescript
const destination = createDestination(elementOrSelector, {
  initialConfig: DestinationConfig,
  showTemplates: boolean,
  showTesting: boolean,
  enableValidation: boolean,
  onConfigChange: (config) => void,
  onTest: (config, event) => void
});

// API Methods
destination.getConfig()                  // Get current configuration
destination.setConfig(config)            // Set configuration
destination.testDestination(event)       // Test with event
destination.validateConfig()             // Validate configuration
destination.exportConfig()               // Export config as JSON
destination.importConfig(json)           // Import config from JSON
destination.loadTemplate(name)           // Load predefined template
destination.getAvailableTemplates()      // Get available templates
```

## 🧪 Testing

The project includes comprehensive testing with Jest and JSDOM:

```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm run test foundation.test.ts

# Run tests with coverage
npm run test:coverage
```

### Test Coverage

- **101 total tests** across 4 test suites
- **Foundation tests (27)** - Core utilities and base components
- **Phase 2 tests (47)** - Individual component functionality
- **Phase 3 tests (27)** - Composite component integration
- **Quick tests** - Fast smoke tests for CI/CD

## 🎨 Demos

Interactive demos are included to showcase all components:

### Phase 2 Demo

```bash
# Serves demo-phase2.html
npm run demo:phase2
```

Features individual components with interactive controls.

### Phase 3 Demo

```bash
# Serves demo-phase3.html
npm run demo:phase3
```

Features composite components with real-world examples.

## 🔧 Development

### Project Structure

```
src/
├── core/                 # Foundation components
│   ├── Component.ts      # Base component factory
│   └── EventBus.ts       # Global event system
├── components/           # All components
│   ├── CodeEditor.ts     # Code editor component
│   ├── Preview.ts        # HTML preview component
│   ├── ResultDisplay.ts  # Results display component
│   ├── LiveCode.ts       # Live coding component
│   ├── EventFlow.ts      # Event visualization component
│   └── Destination.ts    # Destination testing component
├── utils/                # Utility functions
│   ├── dom.ts            # DOM manipulation utilities
│   ├── debounce.ts       # Performance utilities
│   └── syntax.ts         # Syntax highlighting
└── __tests__/            # Test suites
    ├── foundation.test.ts
    ├── phase2-components.test.ts
    └── phase3-composites.test.ts
```

### Build System

```bash
# Development build with watch
npm run dev

# Production build
npm run build

# Type checking
npm run type-check

# Linting
npm run lint
```

The project uses:

- **tsup** for building with multiple output formats (ESM, CJS, IIFE)
- **TypeScript** for type safety and IntelliSense
- **Jest** with JSDOM for testing
- **ESLint** for code quality

## 🎯 Use Cases

### Development Tools

Create interactive code playgrounds and documentation with live examples.

```typescript
const playground = createLiveCode('#playground', {
  layout: 'horizontal',
  initialHTML: '<div>Interactive example</div>',
  onRun: (code) => console.log('Code executed:', code),
});
```

### Event Debugging

Monitor and debug walkerOS events in real-time.

```typescript
const debugger = createEventFlow('#debugger', {
  showMetrics: true,
  onEventCapture: (event) => {
    console.log('Event captured:', event);
    // Send to analytics, log to server, etc.
  }
});
```

### Destination Testing

Test and configure walkerOS destinations with built-in templates.

```typescript
const tester = createDestination('#tester', {
  showTemplates: true,
  onTest: (config, event) => {
    console.log('Testing destination:', config.name);
  },
});
```

## 📖 Documentation

- **[API Reference](./API.md)** - Complete API documentation
- **[Testing Guide](./TESTING.md)** - Testing strategy and best practices
- **[Development Guidelines](./DEVELOPMENT_GUIDELINES.md)** - Development best
  practices

## 🌟 Key Benefits

### For Developers

- **Zero Learning Curve** - Familiar functional patterns
- **Full TypeScript Support** - Complete IntelliSense and type safety
- **Composable Architecture** - Use individual components or combine them
- **Performance Optimized** - Debounced updates and efficient rendering

### For Teams

- **Consistent Architecture** - Functional factory pattern across all components
- **Comprehensive Testing** - High test coverage with automated CI/CD
- **Documentation** - Complete API docs and usage examples
- **Maintenance** - Clean, well-organized codebase

### For Projects

- **Framework Agnostic** - Works with any framework or vanilla JS
- **Theme Support** - Built-in light/dark mode compatibility
- **Responsive Design** - Works on desktop, tablet, and mobile
- **Accessibility** - ARIA support and keyboard navigation

## 🚀 Roadmap

### Immediate (Phase 5)

- [x] Complete testing suite
- [x] Comprehensive documentation
- [x] Interactive demos
- [ ] Performance optimizations
- [ ] Accessibility improvements

### Short Term

- [ ] npm package publication
- [ ] CDN builds for easy integration
- [ ] React wrapper components
- [ ] Storybook integration

### Long Term

- [ ] Browser extension for debugging
- [ ] VS Code extension integration
- [ ] Advanced theming system
- [ ] Plugin architecture for extensibility

## 🤝 Contributing

1. Follow the functional factory pattern established in the codebase
2. Add comprehensive tests for new functionality
3. Update documentation and type definitions
4. Ensure all tests pass: `npm run test`
5. Follow TypeScript best practices

## 📄 License

Part of the walkerOS project. See the main repository for license information.

## 🔗 Links

- **walkerOS Documentation**: https://docs.walkerOS.com
- **GitHub Repository**: https://github.com/elbwalker/walkerOS
- **Issues**: https://github.com/elbwalker/walkerOS/issues
