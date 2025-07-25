# WalkerOS Explorer - Project Refactoring Plan

## Vision

Create a lightweight, modular, and performant vanilla JavaScript component
library that replicates and enhances the functionality of the React-based tools
(LiveCode, LiveDestination, EventFlow) while being completely framework-agnostic
and embeddable in any environment.

## Core Principles

1. **Zero Dependencies** - Pure vanilla JS/TS, no external runtime dependencies
2. **Modular Architecture** - Each component is independently usable
3. **Theme Agnostic** - Works with Tailwind, custom CSS, or no styling
4. **Performance First** - Lighter and faster than React equivalents
5. **Developer Experience** - Simple, intuitive API with TypeScript support
6. **Progressive Enhancement** - Components enhance existing HTML

## Architecture Overview

```
explorer/
├── src/
│   ├── core/
│   │   ├── Component.ts          # Base component class
│   │   ├── EventBus.ts          # Event management
│   │   ├── StateManager.ts      # State management
│   │   └── Theme.ts             # Theme system
│   ├── components/
│   │   ├── CodeEditor.ts        # Code editing with syntax highlighting
│   │   ├── Preview.ts           # HTML preview with interaction
│   │   ├── ResultDisplay.ts     # Result/output display
│   │   ├── LiveCode.ts          # Interactive code execution
│   │   ├── EventFlow.ts         # Event flow visualization
│   │   └── Destination.ts       # Destination testing
│   ├── utils/
│   │   ├── dom.ts               # DOM utilities
│   │   ├── syntax.ts            # Syntax highlighting
│   │   └── debounce.ts          # Performance utilities
│   ├── themes/
│   │   ├── default.ts           # Default theme
│   │   └── tailwind.ts          # Tailwind compatibility
│   ├── index.ts                 # Library exports
│   └── browser.ts               # Browser bundle entry
├── test/
│   └── explorer.test.html       # Single test file
├── dist/
│   ├── explorer.js              # UMD bundle
│   ├── explorer.esm.js          # ES modules
│   └── explorer.min.js          # Minified browser bundle
└── PROJECT.md                   # This file
```

## Phase 1: Foundation (Week 1)

### Goals

- Establish core architecture
- Create base component system
- Implement theme system
- Set up build pipeline

### Tasks

1. **Core Component Factory**

   ```typescript
   // Factory function pattern following walkerOS conventions
   function createComponent(element: HTMLElement | string, options?: ComponentOptions) {
     // Returns component API with isolated state
     return {
       mount(): void
       unmount(): void
       destroy(): void
       on(event: string, handler: Function): void
       emit(event: string, data?: any): void
     }
   }
   ```

2. **Theme System**
   - CSS variable-based theming
   - Automatic light/dark mode detection
   - Tailwind compatibility layer
   - Inline style injection (no external CSS)

3. **State Management**
   - Reactive state updates
   - Component lifecycle hooks
   - Event-driven architecture

4. **Build Setup**
   - Single entry point for browser
   - ES modules for bundlers
   - TypeScript compilation
   - Zero runtime dependencies

### Deliverables

- [ ] Core component system
- [ ] Theme system with Tailwind support
- [ ] Basic build pipeline
- [ ] Initial test harness

## Phase 2: Component Library (Week 2)

### Goals

- Build individual components
- Ensure standalone functionality
- Implement syntax highlighting
- Create reusable utilities

### Components

1. **CodeEditor Factory**

   ```typescript
   // Each call creates isolated editor instance with unique ID
   const editor1 = createCodeEditor('#editor-1', {
     language: 'javascript',
     theme: 'auto', // auto | light | dark
     value: 'console.log("Hello from editor 1")',
     onChange: (value) => console.log('Editor 1:', value),
   });

   const editor2 = createCodeEditor('#editor-2', {
     language: 'html',
     value: '<div>Hello from editor 2</div>',
     onChange: (value) => console.log('Editor 2:', value),
   });
   ```

2. **Preview Factory**

   ```typescript
   const preview = createPreview('#preview', {
     html: '<div>Content</div>',
     sandbox: true,
     onInteraction: (event) => console.log(event),
   });
   ```

3. **ResultDisplay Factory**
   ```typescript
   const result = createResultDisplay('#result', {
     value: { foo: 'bar' },
     format: 'auto', // auto | json | text | html
     expandable: true,
   });
   ```

### Deliverables

- [ ] Standalone CodeEditor component
- [ ] Preview component with sandboxing
- [ ] ResultDisplay with formatting
- [ ] Syntax highlighting without external libs
- [ ] DOM utility functions

## Phase 3: Composite Components (Week 3)

### Goals

- Create LiveCode component
- Build EventFlow visualization
- Implement Destination testing
- Ensure component composition

### Components

1. **LiveCode Factory**

   ```typescript
   // Composes editor and result display with isolated state
   const liveCode = createLiveCode('#container', {
     layout: 'horizontal', // horizontal | vertical
     execute: async (code) => eval(code),
     debounce: 500,
   });
   ```

2. **EventFlow Factory**

   ```typescript
   // Creates 5-panel flow with independent component instances
   const eventFlow = createEventFlow('#container', {
     panels: ['html', 'preview', 'event', 'mapping', 'result'],
     responsive: true,
   });
   ```

3. **Destination Factory**
   ```typescript
   const destination = createDestination('#container', {
     destination: gtag,
     mapping: {},
     events: [],
   });
   ```

### Deliverables

- [ ] LiveCode with execution
- [ ] EventFlow with 5 panels
- [ ] Destination component
- [ ] Component composition patterns
- [ ] Event bus implementation

## Phase 4: Testing & Documentation (Week 4)

### Goals

- Create comprehensive test suite
- Build interactive documentation
- Performance optimization
- Browser compatibility

### Testing Strategy

1. **Single Test File** (`test/explorer.test.html`)

   ```html
   <!DOCTYPE html>
   <html>
     <head>
       <script src="../dist/explorer.js"></script>
       <script>
         // All tests in one file
         const tests = {
           CodeEditor: () => {
             /* test */
           },
           Preview: () => {
             /* test */
           },
           LiveCode: () => {
             /* test */
           },
           // ... all component tests
         };
       </script>
     </head>
     <body>
       <!-- Test containers -->
     </body>
   </html>
   ```

2. **Visual Testing**
   - Component gallery
   - Theme switching
   - Responsive testing
   - Performance metrics

### Deliverables

- [ ] Single comprehensive test file
- [ ] Visual test suite
- [ ] Performance benchmarks
- [ ] API documentation
- [ ] Migration guide from React

## Phase 5: Integration & Polish (Week 5)

### Goals

- Docusaurus integration
- Bundle optimization
- Cross-browser testing
- Production readiness

### Integration Patterns

1. **Vanilla HTML**

   ```html
   <script src="https://unpkg.com/@walkeros/explorer"></script>
   <script>
     const { LiveCode, EventFlow } = WalkerExplorer;
     new LiveCode('#my-editor');
   </script>
   ```

2. **ES Modules**

   ```javascript
   import { LiveCode, EventFlow } from '@walkeros/explorer';
   ```

3. **React Wrapper** (optional)
   ```jsx
   import { LiveCode } from '@walkeros/explorer/react';
   <LiveCode onExecute={handleExecute} />;
   ```

### Deliverables

- [ ] Docusaurus integration guide
- [ ] Optimized bundles (<10KB gzipped per component)
- [ ] Cross-browser compatibility
- [ ] NPM publishing setup
- [ ] CDN distribution

## Design Decisions

### 1. No CSS Postfix

- Components use clean names: `CodeEditor`, not `CodeEditorCSS`
- CSS is embedded via JavaScript (no external stylesheets)
- Theme system handles styling variations

### 2. Tailwind Compatibility

```javascript
// Theme system adapts to environment
const theme = {
  light: {
    background: 'var(--tw-bg-white, #ffffff)',
    text: 'var(--tw-text-gray-900, #111827)',
    border: 'var(--tw-border-gray-200, #e5e7eb)',
  },
  dark: {
    background: 'var(--tw-bg-gray-900, #111827)',
    text: 'var(--tw-text-gray-100, #f3f4f6)',
    border: 'var(--tw-border-gray-700, #374151)',
  },
};
```

### 3. Component Lifecycle

```javascript
// Simple, predictable lifecycle
component.mount(); // Initial render
component.update(); // Update state
component.unmount(); // Temporary removal
component.destroy(); // Complete cleanup
```

### 4. Event System

```javascript
// Unified event handling
component.on('change', handler);
component.off('change', handler);
component.emit('change', data);
```

### 5. State Management

```javascript
// Reactive state without frameworks
component.setState({ value: 'new' });
component.getState(); // { value: 'new' }
component.subscribe((state) => console.log(state));
```

## Success Metrics

1. **Performance**
   - Components load in <50ms
   - First paint in <100ms
   - Memory footprint <1MB per component
   - 60fps interactions

2. **Developer Experience**
   - Single-file test capability
   - <5 minute setup time
   - Intuitive API
   - TypeScript intellisense

3. **Compatibility**
   - Works in all modern browsers
   - No polyfills required
   - Progressive enhancement
   - Graceful degradation

4. **Bundle Size**
   - Core: <5KB gzipped
   - Each component: <10KB gzipped
   - Full bundle: <30KB gzipped
   - Tree-shakeable

## Migration Path

### From React Components

```javascript
// Before (React)
<LiveCode input={code} fn={execute} output={result} />;

// After (Functional)
const liveCode = createLiveCode('#container', {
  value: code,
  onExecute: execute,
  onResult: (result) => console.log(result),
});
```

### Progressive Migration

1. Start with single component
2. Test in isolation
3. Replace React component
4. Repeat for each component
5. Remove React dependencies

## Next Steps

1. **Immediate Actions**
   - Remove CSS postfix from all components
   - Consolidate component architecture
   - Create single test file template
   - Design theme system

2. **Week 1 Goals**
   - Complete Phase 1 foundation
   - Working prototype of CodeEditor
   - Theme system implementation
   - Test harness setup

3. **Success Criteria**
   - All React functionality replicated
   - Better performance metrics
   - Smaller bundle size
   - Easier integration
