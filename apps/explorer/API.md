# WalkerOS Explorer - API Documentation

Complete API reference for all WalkerOS Explorer components and utilities.

## Table of Contents

- [Core Components](#core-components)
- [Individual Components (Phase 2)](#individual-components-phase-2)
- [Composite Components (Phase 3)](#composite-components-phase-3)
- [Utilities](#utilities)
- [Types and Interfaces](#types-and-interfaces)

## Core Components

### Component Factory

Base factory for all WalkerOS Explorer components.

```typescript
import { createComponent, type ComponentAPI } from '@walkerOS/explorer';

const component = createComponent(elementOrSelector, options);
```

#### ComponentAPI

```typescript
interface ComponentAPI {
  id: string; // Unique component identifier
  mount(): void; // Mount component to DOM
  unmount(): void; // Unmount component from DOM
  destroy(): void; // Destroy component and cleanup
  on(event: string, handler: Function): () => void; // Subscribe to events
  emit(event: string, data?: unknown): void; // Emit events
  setTheme(theme: 'light' | 'dark'): void; // Set component theme
  getElement(): HTMLElement | null; // Get component DOM element
}
```

### Event Bus

Global event system for component communication.

```typescript
import { eventBus } from '@walkerOS/explorer';

// Subscribe to events
const unsubscribe = eventBus.on('event-name', (data) => {
  console.log('Event received:', data);
});

// Emit events
eventBus.emit('event-name', { key: 'value' });

// Unsubscribe
unsubscribe();
```

## Individual Components (Phase 2)

### CodeEditor

Interactive code editor with syntax highlighting and multiple language support.

```typescript
import { createCodeEditor, type CodeEditorAPI } from '@walkerOS/explorer';

const editor = createCodeEditor('#editor-container', {
  language: 'javascript',
  value: 'console.log("Hello World");',
  height: '400px',
  showLineNumbers: true,
  showCopyButton: true,
  onChange: (value, language) => {
    console.log('Code changed:', value);
  },
});
```

#### CodeEditorOptions

```typescript
interface CodeEditorOptions {
  language?: SupportedLanguage; // Programming language
  value?: string; // Initial code content
  height?: string; // Editor height
  showLineNumbers?: boolean; // Show line numbers
  showCopyButton?: boolean; // Show copy to clipboard button
  readOnly?: boolean; // Read-only mode
  onChange?: (value: string, language: SupportedLanguage) => void; // Change callback
}

type SupportedLanguage =
  | 'javascript'
  | 'typescript'
  | 'html'
  | 'css'
  | 'json'
  | 'markdown';
```

#### CodeEditorAPI

```typescript
interface CodeEditorAPI extends ComponentAPI {
  getValue(): string; // Get current code
  setValue(value: string): void; // Set code content
  getLanguage(): SupportedLanguage; // Get current language
  setLanguage(language: SupportedLanguage): void; // Set programming language
  focus(): void; // Focus the editor
  selectAll(): void; // Select all content
  insertText(text: string): void; // Insert text at cursor
  getSelection(): {
    // Get current selection
    start: number;
    end: number;
    text: string;
  };
}
```

### Preview

HTML preview component with iframe sandboxing and error handling.

```typescript
import { createPreview, type PreviewAPI } from '@walkerOS/explorer';

const preview = createPreview('#preview-container', {
  html: '<h1>Hello World</h1>',
  height: '400px',
  sandbox: true,
  showErrors: true,
  onLoad: (iframe) => {
    console.log('Preview loaded');
  },
  onError: (error) => {
    console.error('Preview error:', error);
  },
});
```

#### PreviewOptions

```typescript
interface PreviewOptions {
  html?: string; // Initial HTML content
  autoUpdate?: boolean; // Auto-update on HTML change
  showErrors?: boolean; // Show error overlay
  sandbox?: boolean; // Enable iframe sandbox
  height?: string; // Preview height
  title?: string; // Preview title
  onLoad?: (iframe: HTMLIFrameElement) => void; // Load callback
  onError?: (error: string) => void; // Error callback
  onUpdate?: (html: string) => void; // Update callback
}
```

#### PreviewAPI

```typescript
interface PreviewAPI extends ComponentAPI {
  setHTML(html: string): void; // Set HTML content
  getHTML(): string; // Get current HTML
  refresh(): void; // Refresh preview
  getIframe(): HTMLIFrameElement | null; // Get iframe element
  executeScript(script: string): Promise<any>; // Execute script in preview
  injectCSS(css: string): void; // Inject CSS into preview
}
```

### ResultDisplay

Display execution results with multiple result types and formatting.

```typescript
import { createResultDisplay, type ResultDisplayAPI } from '@walkerOS/explorer';

const results = createResultDisplay('#results-container', {
  showCopyButton: true,
  showTimestamps: true,
  maxResults: 100,
  height: '300px',
  autoScroll: true,
});
```

#### ResultDisplayOptions

```typescript
interface ResultDisplayOptions {
  showCopyButton?: boolean; // Show copy button for results
  showTimestamps?: boolean; // Show timestamps
  maxResults?: number; // Maximum number of results
  height?: string; // Container height
  autoScroll?: boolean; // Auto-scroll to new results
  onResultAdd?: (result: ResultItem) => void; // Result added callback
}
```

#### ResultDisplayAPI

```typescript
interface ResultDisplayAPI extends ComponentAPI {
  addResult(result: ResultItem): void; // Add generic result
  addValue(value: unknown, label?: string): void; // Add value result
  addError(error: Error | string, label?: string): void; // Add error result
  addLog(message: string, label?: string): void; // Add log result
  addWarning(message: string, label?: string): void; // Add warning result
  addInfo(message: string, label?: string): void; // Add info result
  clear(): void; // Clear all results
  getResults(): ResultItem[]; // Get all results
  setResults(results: ResultItem[]): void; // Set results array
}
```

#### Result Types

```typescript
interface ResultItem {
  id: string; // Unique result ID
  type: ResultType; // Result type
  value: unknown; // Result value
  label?: string; // Optional label
  timestamp: number; // Creation timestamp
}

type ResultType = 'value' | 'error' | 'log' | 'warning' | 'info';
```

## Composite Components (Phase 3)

### LiveCode

Combined code editor and preview for live HTML/CSS/JS development.

```typescript
import { createLiveCode, type LiveCodeAPI } from '@walkerOS/explorer';

const liveCode = createLiveCode('#livecode-container', {
  layout: 'horizontal',
  showTabs: true,
  showResults: true,
  autoRun: true,
  initialHTML: '<h1>Hello World</h1>',
  initialCSS: 'h1 { color: blue; }',
  initialJS: 'console.log("Hello");',
  onRun: (code) => {
    console.log('Code executed:', code);
  },
});
```

#### LiveCodeOptions

```typescript
interface LiveCodeOptions {
  layout?: 'horizontal' | 'vertical' | 'tabs'; // Layout mode
  showTabs?: boolean; // Show editor tabs
  showResults?: boolean; // Show results panel
  autoRun?: boolean; // Auto-run on code change
  runDelay?: number; // Debounce delay for auto-run
  initialHTML?: string; // Initial HTML content
  initialCSS?: string; // Initial CSS content
  initialJS?: string; // Initial JavaScript content
  editorHeight?: string; // Editor section height
  previewHeight?: string; // Preview section height
  enableConsoleCapture?: boolean; // Capture console output
  onRun?: (code: { html: string; css: string; js: string }) => void; // Run callback
  onError?: (error: string) => void; // Error callback
}
```

#### LiveCodeAPI

```typescript
interface LiveCodeAPI extends ComponentAPI {
  getHTML(): string; // Get HTML content
  getCSS(): string; // Get CSS content
  getJS(): string; // Get JavaScript content
  setHTML(html: string): void; // Set HTML content
  setCSS(css: string): void; // Set CSS content
  setJS(js: string): void; // Set JavaScript content
  run(): void; // Execute code manually
  clear(): void; // Clear all editors
  setLayout(layout: 'horizontal' | 'vertical' | 'tabs'): void; // Change layout
  getActiveEditor(): CodeEditorAPI | null; // Get currently active editor
  getPreview(): PreviewAPI; // Get preview component
  getResults(): ResultDisplayAPI | null; // Get results component
}
```

### EventFlow

WalkerOS event visualization and debugging component.

```typescript
import { createEventFlow, type EventFlowAPI } from '@walkerOS/explorer';

const eventFlow = createEventFlow('#eventflow-container', {
  maxEvents: 1000,
  showTimeline: true,
  showFilters: true,
  showMetrics: true,
  groupByEntity: false,
  autoScroll: true,
  onEventCapture: (event) => {
    console.log('Event captured:', event);
  },
  onEventSelect: (event) => {
    console.log('Event selected:', event);
  },
});
```

#### EventFlowOptions

```typescript
interface EventFlowOptions {
  maxEvents?: number; // Maximum events to keep
  showTimeline?: boolean; // Show events timeline
  showFilters?: boolean; // Show filter controls
  showMetrics?: boolean; // Show performance metrics
  groupByEntity?: boolean; // Group events by entity
  autoScroll?: boolean; // Auto-scroll to new events
  height?: string; // Component height
  onEventCapture?: (event: WalkerEvent) => void; // Event capture callback
  onEventSelect?: (event: WalkerEvent) => void; // Event selection callback
  onExport?: (events: WalkerEvent[]) => void; // Export callback
}
```

#### EventFlowAPI

```typescript
interface EventFlowAPI extends ComponentAPI {
  addEvent(event: WalkerEvent): void; // Add new event
  getEvents(): WalkerEvent[]; // Get all events
  clearEvents(): void; // Clear all events
  filterEvents(filter: string | RegExp): void; // Filter events
  exportEvents(): WalkerEvent[]; // Export filtered events
  setGrouping(enabled: boolean): void; // Toggle event grouping
  getMetrics(): EventMetrics; // Get performance metrics
}
```

#### WalkerEvent Interface

```typescript
interface WalkerEvent {
  event: string; // Event name
  data?: Record<string, unknown>; // Event data
  context?: Record<string, unknown>; // Context data
  globals?: Record<string, unknown>; // Global data
  user?: Record<string, unknown>; // User data
  nested?: WalkerEvent[]; // Nested events
  timestamp?: number; // Event timestamp
  id?: string; // Unique event ID
  source?: string; // Event source
  timing?: {
    // Performance timing
    trigger: number;
    processed: number;
    sent: number;
  };
}
```

### Destination

WalkerOS destination testing and configuration component.

```typescript
import { createDestination, type DestinationAPI } from '@walkerOS/explorer';

const destination = createDestination('#destination-container', {
  initialConfig: {
    name: 'My Destination',
    id: 'my_dest',
    config: { apiKey: 'secret' },
    init: 'return { ready: true };',
    push: 'return { sent: true };',
  },
  showTemplates: true,
  showTesting: true,
  enableValidation: true,
  onConfigChange: (config) => {
    console.log('Config changed:', config);
  },
});
```

#### DestinationOptions

```typescript
interface DestinationOptions {
  initialConfig?: DestinationConfig; // Initial configuration
  showTemplates?: boolean; // Show template selector
  showTesting?: boolean; // Show testing interface
  enableValidation?: boolean; // Enable config validation
  height?: string; // Component height
  onConfigChange?: (config: DestinationConfig) => void; // Config change callback
  onTest?: (config: DestinationConfig, event: WalkerEvent) => void; // Test callback
  onValidate?: (config: DestinationConfig) => ValidationResult[]; // Custom validation
}
```

#### DestinationAPI

```typescript
interface DestinationAPI extends ComponentAPI {
  getConfig(): DestinationConfig; // Get current configuration
  setConfig(config: DestinationConfig): void; // Set configuration
  testDestination(event: WalkerEvent): Promise<unknown>; // Test with event
  validateConfig(): ValidationResult[]; // Validate configuration
  exportConfig(): string; // Export config as JSON
  importConfig(json: string): boolean; // Import config from JSON
  loadTemplate(templateName: string): void; // Load predefined template
  getAvailableTemplates(): string[]; // Get available templates
}
```

#### Destination Configuration

```typescript
interface DestinationConfig {
  name: string; // Destination name
  id: string; // Unique identifier
  config: Record<string, unknown>; // Configuration object
  init?: string; // Initialization JavaScript
  push?: string; // Event push JavaScript
  custom?: Record<string, unknown>; // Custom properties
}

interface ValidationResult {
  type: 'error' | 'warning' | 'info'; // Validation level
  message: string; // Validation message
  field?: string; // Related field
  code?: string; // Error code
}
```

## Utilities

### DOM Utilities

```typescript
import { createElement, addEventListener, injectCSS } from '@walkerOS/explorer';

// Create DOM elements
const element = createElement('div', {
  className: 'my-class',
  textContent: 'Hello World',
  style: 'color: red;',
});

// Add event listeners with cleanup
const cleanup = addEventListener(element, 'click', (event) => {
  console.log('Clicked:', event);
});

// Inject CSS styles
injectCSS('.my-styles { color: blue; }', 'unique-style-id');
```

### Performance Utilities

```typescript
import { debounce, throttle, memoize } from '@walkerOS/explorer';

// Debounce function calls
const debouncedSave = debounce((data) => {
  console.log('Saving:', data);
}, 500);

// Throttle function calls
const throttledScroll = throttle((event) => {
  console.log('Scrolling:', event);
}, 100);

// Memoize expensive computations
const memoizedCalculation = memoize((input) => {
  return expensiveCalculation(input);
});
```

### Syntax Highlighting

```typescript
import { highlightSyntax, detectLanguage } from '@walkerOS/explorer';

// Highlight code syntax
const highlightedHTML = highlightSyntax('console.log("hello");', 'javascript');

// Auto-detect programming language
const language = detectLanguage('function hello() { return "world"; }');
console.log(language); // 'javascript'
```

## Types and Interfaces

### Theme Types

```typescript
type Theme = 'light' | 'dark' | 'auto';
```

### Event Types

```typescript
interface ComponentEvent {
  type: string; // Event type
  target: ComponentAPI; // Event source
  data?: unknown; // Event data
  timestamp: number; // Event timestamp
}
```

### Error Types

```typescript
interface ComponentError extends Error {
  component: string; // Component name
  code?: string; // Error code
  details?: Record<string, unknown>; // Additional details
}
```

## Usage Examples

### Basic Component Setup

```typescript
import { createCodeEditor, createPreview } from '@walkerOS/explorer';

// Create editor
const editor = createCodeEditor('#editor', {
  language: 'html',
  value: '<h1>Hello World</h1>',
  onChange: (html) => {
    preview.setHTML(html);
  },
});

// Create preview
const preview = createPreview('#preview', {
  height: '400px',
  onError: (error) => {
    console.error('Preview error:', error);
  },
});
```

### Event Communication

```typescript
import { eventBus } from '@walkerOS/explorer';

// Component A emits events
const editorComponent = createCodeEditor('#editor');
editorComponent.on('code-change', (code) => {
  eventBus.emit('global-code-change', code);
});

// Component B listens for events
const previewComponent = createPreview('#preview');
eventBus.on('global-code-change', (code) => {
  previewComponent.setHTML(code);
});
```

### Advanced Integration

```typescript
import {
  createLiveCode,
  createEventFlow,
  createDestination,
} from '@walkerOS/explorer';

// Create integrated development environment
const liveCode = createLiveCode('#editor', {
  layout: 'horizontal',
  enableConsoleCapture: true,
  onRun: (code) => {
    // Simulate walkerOS event
    eventFlow.addEvent({
      event: 'code_execution',
      data: {
        html: code.html.length,
        css: code.css.length,
        js: code.js.length,
      },
      timestamp: Date.now(),
    });
  },
});

// Create event monitoring
const eventFlow = createEventFlow('#events', {
  maxEvents: 500,
  showMetrics: true,
  onEventSelect: (event) => {
    console.log('Selected event:', event);
  },
});

// Create destination testing
const destination = createDestination('#destination', {
  showTemplates: true,
  onTest: (config, event) => {
    console.log('Testing destination:', config.name, 'with event:', event);
  },
});
```

This API documentation provides comprehensive coverage of all WalkerOS Explorer
components and utilities, enabling developers to effectively use and integrate
the components in their applications.
