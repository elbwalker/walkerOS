# WalkerOS Explorer Development Plan

## Overview

The WalkerOS Explorer package aims to fully replace the existing website
components (EventFlow, LiveCode, CodeBox, Preview) with a unified,
framework-agnostic solution. This plan outlines a phased approach to complete
the explorer package and integrate it into the walkerOS ecosystem.

## Current State Analysis

### Existing Website Components

1. **EventFlow** (`website/src/components/organisms/eventFlow.tsx`):
   - 5-panel interactive flow: HTML → Preview → Event → Mapping → Result
   - React-based with context providers
   - Uses DestinationContextProvider for shared state
   - Integrates with taggingRegistry for event capture

2. **LiveCode** (`website/src/components/organisms/liveCode.tsx`):
   - 3-panel layout: Input → Config → Output
   - Used extensively in documentation for interactive examples
   - Supports async function execution with error handling
   - Debounced updates for performance

3. **CodeBox** (`website/src/components/molecules/codeBox.tsx`):
   - Syntax highlighting with react-simple-code-editor
   - Prettier formatting
   - Copy functionality
   - Typewriter animation support

4. **Preview** (`website/src/components/molecules/preview.tsx`):
   - HTML rendering with shadow DOM isolation
   - Event capture integration
   - Live updates on HTML changes

### Explorer Package Status

- ✅ Vanilla JS implementation complete
- ✅ Shadow DOM isolation
- ✅ Syntax highlighting engine
- ✅ Element explorer functionality
- ✅ Destination testing components
- ❌ LiveCode component (claimed migrated but missing)
- ❌ EventFlow component
- ❌ Full React component exports

## Implementation Phases

### Phase 1: Core Components (Foundation) ✅ COMPLETED

**Goal**: Create stateless, reusable building blocks

#### Requirements

- [x] Create base `CodeEditor` component with:
  - Syntax highlighting with tokenized approach (fixed weird character issues)
  - Event emission for value changes
  - Copy functionality in header
- [x] Create `HtmlPreview` component with:
  - Shadow DOM rendering (no iframe)
  - Event capture hooks
  - Live reload on content change
  - Security isolation
- [x] Create smart `CodeBox` wrapper component:
  - Manages common UI patterns (labels, actions, layouts)
  - Wraps CodeEditor with consistent styling
  - Handles copy/format/reset actions in shared header
  - Provides responsive container
- [x] Create `ResultDisplay` component:
  - JSON/object visualization with consistent monospace fonts
  - Error state handling
  - Empty state messages
- [x] Create `SharedHeader` component:
  - Consistent button layout across all components
  - Icon-based actions (copy, format, reset, fullscreen)
  - Unified styling and behavior

#### Definition of Done

- [x] All components work standalone in vanilla JS
- [x] Each component has clear API documentation
- [x] Components emit events for external state management
- [x] Comprehensive tests covering full functionality
- [x] Zero framework dependencies
- [x] Single demo.html file for testing
- [x] Lean serve.js for demo server

#### Phase 1 Achievements

- **UI Consistency**: All components use shared header with standardized button
  layout
- **Button Consolidation**: Eliminated inline buttons, moved all actions to
  headers
- **Font Consistency**: Fixed mixed font families across components
- **Layout Fixes**: Resolved overlapping HTML Source box in Component
  Integration
- **Syntax Highlighting**: Fixed "weird characters" issue with tokenized
  approach
- **Demo Consolidation**: Single demo.html file replaces multiple test files

### Phase 2: LiveCode Implementation ✅ COMPLETED

**Goal**: Replace the React LiveCode component with vanilla JS equivalent

#### Requirements

- [x] Create `LiveCode` class that:
  - Manages 3-panel layout (Input, Config, Output)
  - Handles function execution with debouncing (500ms default)
  - Supports async operations with Promise.resolve
  - Uses provided function for deterministic execution
  - Handles errors gracefully with detailed error objects
- [x] Implement configuration options:
  - Custom panel labels (inputLabel, configLabel, outputLabel)
  - Disable/enable panels (showConfig, showOutput)
  - Height configuration and responsive design
  - Execute and reset buttons in shared header
- [x] Provide comprehensive API:
  - `setInput()`, `getInput()`, `setConfig()`, `getConfig()`
  - `execute()`, `setFunction()`, `setTheme()`
  - Event callbacks: `onExecute`, `onError`

#### Definition of Done

- [x] Feature parity with React LiveCode component
- [x] Interactive demo with JavaScript and data processing examples
- [x] Performance optimized with debouncing and execution cancellation
- [x] Comprehensive error handling and validation
- [x] Integrated with SharedHeader for consistent UI

#### Phase 2 Achievements

- **3-Panel Layout**: Input, Config, Output panels with responsive grid
- **Smart Execution**: Debounced execution with cancellation of outdated
  requests
- **Error Handling**: Comprehensive error capture with stack traces and
  timestamps
- **Theme Support**: Consistent theming across all child components
- **API Compatibility**: Easy migration path from React LiveCode
- **Interactive Demo**: Two working examples showcasing mathematical and data
  processing functions

### Phase 3: EventFlow Implementation ✅ COMPLETED

**Goal**: Create the complete 5-panel event flow visualization

#### Requirements

- [x] Create `EventFlow` class that:
  - Manages 5-panel layout (HTML, Preview, Event, Mapping, Result)
  - Integrates with walkerOS tagging system through simulated event capture
  - Processes mapping configurations with JSON transformation
  - Shows real-time event transformations with debounced updates
- [x] Implement state coordination:
  - HTML changes update preview automatically (200ms debounce)
  - Preview interactions generate walkerOS-compatible events
  - Events process through mapping configuration (600ms debounce)
  - Results update in real-time with comprehensive error handling
- [x] Create comprehensive public API with methods:
  - `setHtml()`, `getHtml()`, `setMapping()`, `getMapping()`
  - `getEvents()`, `simulateEvent()`, `clearEvents()`
  - Full responsive design with mobile-first approach

#### Definition of Done

- [x] Feature parity with React EventFlow component
- [x] Handles all edge cases (errors, invalid JSON, malformed mapping)
- [x] Responsive layout with proper mobile stacking (5→2→1 panels)
- [x] Full-screen mode with browser fullscreen API
- [x] Interactive demo with e-commerce and form examples

#### Phase 3 Achievements

- **5-Panel Architecture**: HTML, Preview, Event, Mapping, Result panels with
  responsive grid
- **walkerOS Integration**: Simulated event capture with realistic event
  structure
- **Smart Mapping Engine**: JSON-based transformation with entity.action → event
  mapping
- **Real-time Processing**: Debounced updates with execution cancellation for
  performance
- **Comprehensive API**: Full programmatic control with event simulation
  capabilities
- **Interactive Examples**: E-commerce product interactions and form processing
  demos

### Phase 4: React Wrapper Components

**Goal**: Provide React components for easy migration

#### Requirements

- [ ] Create React wrapper for each vanilla component:
  - `<CodeEditor />`
  - `<LiveCode />`
  - `<EventFlow />`
  - `<HtmlPreview />`
- [ ] Maintain backward compatibility with existing props
- [ ] Handle React lifecycle properly (cleanup on unmount)
- [ ] TypeScript definitions for all components

#### Definition of Done

- Drop-in replacement for existing React components
- No breaking changes in component APIs
- React demo app uses explorer components
- Migration guide documented

### Phase 5: Website Integration

**Goal**: Replace all website components with explorer package

#### Requirements

- [ ] Update all imports from local components to `@walkerOS/explorer`
- [ ] Remove old component files from website
- [ ] Update any component-specific styles
- [ ] Test all documentation pages
- [ ] Performance optimization

#### Definition of Done

- Website builds successfully with explorer package
- All interactive examples work correctly
- No visual regressions
- Performance metrics maintained or improved
- Old components removed from codebase

### Phase 6: Advanced Features

**Goal**: Enhance explorer with additional capabilities

#### Requirements

- [ ] Multi-language syntax highlighting (TS, JSON, HTML, CSS)
- [ ] Diff view for before/after comparisons
- [ ] Export functionality (CodePen, JSFiddle)
- [ ] Keyboard shortcuts
- [ ] Theme customization
- [ ] Collaborative editing preparation

#### Definition of Done

- Features work across all components
- Backward compatible implementation
- Feature flags for optional features
- Documentation for new capabilities

## Package Structure

```
@walkerOS/explorer/
├── src/
│   ├── components/
│   │   ├── code-editor/
│   │   │   ├── index.ts
│   │   │   ├── code-editor.ts
│   │   │   └── code-editor.test.ts
│   │   ├── html-preview/
│   │   │   ├── index.ts
│   │   │   ├── html-preview.ts
│   │   │   └── html-preview.test.ts
│   │   ├── live-code/
│   │   │   ├── index.ts
│   │   │   ├── live-code.ts
│   │   │   └── live-code.test.ts
│   │   ├── event-flow/
│   │   │   ├── index.ts
│   │   │   ├── event-flow.ts
│   │   │   └── event-flow.test.ts
│   │   └── index.ts
│   ├── react/
│   │   ├── CodeEditor.tsx
│   │   ├── LiveCode.tsx
│   │   ├── EventFlow.tsx
│   │   └── index.ts
│   ├── core/
│   │   ├── base-component.ts
│   │   ├── state-manager.ts
│   │   └── event-emitter.ts
│   ├── utils/
│   │   ├── dom.ts
│   │   ├── sandbox.ts
│   │   └── format.ts
│   └── index.ts
```

## Development Rules

### 1. Code Quality

- **TypeScript**: Strict mode, no `any` types
- **Testing**: Focus on complete component functionality over coverage metrics
- **Linting**: Run `npm run lint` before marking tasks complete
- **Documentation**: JSDoc for all public APIs

### 2. Component Design

- **Smart Components**: Intelligent components that handle their own concerns
- **Event-Driven**: Use events for all communication
- **Composable**: Components that work together seamlessly
- **Accessible**: ARIA labels, keyboard navigation
- **Shadow DOM First**: Isolation and encapsulation by default

### 3. Performance

- **Debouncing**: User input debounced appropriately
- **Virtual DOM**: Consider for large data sets
- **Code Splitting**: Separate heavy features (syntax highlighting)
- **Memory Management**: Proper cleanup on destroy

### 4. Testing Strategy

- **Component Tests**: One comprehensive test per component covering full
  functionality
- **Integration Tests**: Full user workflows with real walkerOS instances
- **Performance Tests**: Render time and memory usage

### 5. Before Marking Complete

- [ ] All tests pass (`npm test`)
- [ ] Linting passes (`npm run lint`)
- [ ] Types check (`npm run typecheck`)
- [ ] Documentation updated
- [ ] Examples added/updated
- [ ] Performance acceptable

## Future Usage Examples

### Basic LiveCode

```javascript
import { createLiveCode } from '@walkerOS/explorer';

const liveCode = createLiveCode(document.getElementById('demo'), {
  input: 'await getMappingValue({ foo: "bar" }, "foo")',
  fn: getMappingValue,
  fnName: 'getMappingValue',
  height: '400px',
});
```

### EventFlow Integration

```javascript
import { createEventFlow } from '@walkerOS/explorer';

const flow = createEventFlow(document.getElementById('flow'), {
  code: '<div data-elb="product" data-elb-id="123">Product</div>',
  mapping: {
    product: {
      view: { name: 'product_viewed' },
    },
  },
});
```

### React Usage

```jsx
import { LiveCode, EventFlow } from '@walkerOS/explorer/react';

function Demo() {
  return (
    <>
      <LiveCode input="console.log('Hello')" fn={evalCode} height="300px" />
      <EventFlow code={htmlCode} mapping={mappingConfig} />
    </>
  );
}
```

## Success Metrics

1. **Performance**: Components render in < 100ms
2. **Bundle Size**: < 50KB gzipped for core components
3. **Compatibility**: Works in all modern browsers
4. **Developer Experience**: Setup in < 5 minutes
5. **User Satisfaction**: Improved documentation interaction

## Next Steps

1. Review and approve this plan
2. Set up development environment
3. Begin Phase 1 implementation
4. Create tracking issues for each phase
5. Establish review process for each component

---

This plan provides a clear path from the current state to a fully-featured
explorer package that can replace all existing website components while
providing a better, more maintainable solution for the walkerOS ecosystem.

## Design Philosophy

### Smart Components

Components should be intelligent and handle their own concerns rather than being
purely presentational. This means:

- **Self-contained**: Components manage their own state and lifecycle
- **Contextually aware**: Components understand their purpose and optimize
  accordingly
- **Defensive**: Components handle edge cases and errors gracefully
- **Adaptive**: Components adjust behavior based on their environment

### Shadow DOM Integration

All components use Shadow DOM for:

- **Style isolation**: No CSS conflicts with parent applications
- **DOM encapsulation**: Clean separation from host document
- **Event management**: Proper event bubbling and handling
- **Security**: Natural sandboxing without iframe complexity

### Deterministic Processing

With walkerOS packages, we have deterministic setups:

- **Direct instance access**: Pass walkerOS instances for direct method calls
- **Predictable outputs**: No need to capture console.log, get results directly
- **Clean testing**: Easier to test with known inputs and outputs

## Backlog

### CodeEditor

- Copy functionality
- Format functionality
- Configurable read-only mode

### Testing

- **Visual Regression**: Screenshot comparisons for UI consistency
