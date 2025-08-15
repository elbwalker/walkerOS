# Explorer Package Documentation

**Pure vanilla JavaScript component library** following atomic design principles
with zero framework dependencies.

## Architecture Overview

### Core Principles

1. **Pure Vanilla JavaScript** - No React, no framework dependencies
2. **Factory Function Pattern** - Consistent `createComponent()` pattern with
   closure-based state
3. **Atomic Design Hierarchy** - Clear separation: atoms → molecules → organisms
4. **Shadow DOM Isolation** - Style encapsulation and component isolation
5. **Clean Naming Conventions** - Predictable, consistent naming throughout

### Package Structure

```
apps/explorer/
├── src/
│   ├── atoms/           # Basic building blocks
│   │   ├── box.ts      # Container with header/footer
│   │   ├── button.ts   # Button with variants
│   │   ├── editor.ts   # Code editor with syntax highlighting
│   │   └── label.ts    # Text labels
│   │
│   ├── molecules/       # Composed atoms
│   │   ├── codeBox.ts  # Editor + label + controls
│   │   └── resultBox.ts # Multi-format result display
│   │
│   ├── organisms/       # Complete features
│   │   └── liveCode.ts # 2-column interactive code execution
│   │
│   ├── layouts/         # Layout managers
│   │   └── columns.ts  # Responsive multi-column layouts
│   │
│   ├── lib/            # Core utilities (NOT "utils" or "core")
│   │   ├── dom.ts      # Shadow DOM utilities
│   │   ├── evaluate.ts # Safe JS execution
│   │   ├── syntax.ts   # Lightweight syntax highlighting
│   │   └── debounce.ts # Performance utilities
│   │
│   ├── styles/         # Theming system
│   │   └── theme.ts    # CSS variables & theming
│   │
│   ├── types/          # TypeScript definitions
│   │   └── index.ts    # All type exports
│   │
│   └── index.ts        # Main exports
│
├── examples/           # HTML examples
│   ├── index.html     # Landing page
│   └── livecode.html  # LiveCode demonstrations
│
└── dist/              # Built files
    ├── index.mjs      # ES module
    ├── index.cjs      # CommonJS
    └── explorer.js    # IIFE bundle for browser
```

## Component APIs

### Consistent Factory Pattern

Every component follows the same pattern:

```typescript
export function createComponent(element: HTMLElement, options?: Options): API {
  // Private state via closure
  let state = { ...defaultState, ...options };

  // Shadow DOM for isolation
  const { shadow, container } = createShadow(element);

  // Return public API
  return {
    getValue: () => state.value,
    setValue: (value) => updateState({ value }),
    destroy: () => cleanup(),
  };
}
```

### Component Hierarchy

#### Atoms (Indivisible)

- `createBox()` - Base container
- `createEditor()` - Text editor with syntax highlighting
- `createButton()` - Action buttons
- `createLabel()` - Text labels

#### Molecules (Composed)

- `createCodeBox()` - Editor with controls
- `createResultBox()` - Output display with formatting

#### Organisms (Features)

- `createLiveCode()` - Complete code playground

## Usage

### ES Modules

```javascript
import { createLiveCode } from '@walkeros/explorer';

const liveCode = createLiveCode(element, {
  input: 'return 1 + 1;',
  context: {
    /* functions */
  },
});
```

### Browser Global (IIFE)

```html
<script src="/dist/explorer.js"></script>
<script>
  const { createLiveCode } = WalkerExplorer;
  const liveCode = createLiveCode(element, options);
</script>
```

## Development Commands

```bash
# Development
npm run dev     # Jest watch mode for TDD
npm run demo    # Start demo server (port 3002)

# Build
npm run build   # Build all formats

# Test
npm run test    # Run test suite
```

### Key Files

- **Main Entry**: `src/index.ts`
- **Types**: `src/types/index.ts`
- **Examples**: `examples/livecode.html`
- **Bundle**: `dist/explorer.js` (IIFE for browser)

## Key Design Decisions

### Why Factory Functions?

- Better encapsulation than classes
- No `this` binding issues
- Natural private state via closures
- Easier composition

### Why Shadow DOM?

- Complete style isolation
- No CSS conflicts
- Multiple instances without issues
- Self-contained components

### Why lib/ not utils/?

- `lib/` implies core library functionality
- Distinguishes from generic utilities
- Follows Node.js conventions

## Bundle Sizes

- ES Module: ~44KB
- CommonJS: ~45KB
- IIFE Bundle: ~49KB
- **Target: < 30KB gzipped** ✅

## Testing Strategy

- Unit tests for each component
- Shadow DOM mocking for JSDOM
- Integration tests for composition
- Visual testing via examples

## Future Roadmap

### Phase 2: Extended Components

- [ ] MappingPlayground - 3-column mapping editor
- [ ] EventFlow - HTML preview with event capture
- [ ] DebugPanel - Performance and debugging tools

### Phase 3: Advanced Features

- [ ] Monaco editor integration (optional)
- [ ] Resizable split panes
- [ ] Persistent state management
- [ ] Export/import configurations

### Phase 4: Canvas Architecture (Future Vision)

- [ ] Drag-and-drop components
- [ ] Visual connections between components
- [ ] Serialization for saving/loading
- [ ] Zoom and pan navigation

## Contributing Guidelines

### Adding New Components

1. **Choose the right level**:
   - Atom: Single-purpose, no dependencies on other atoms
   - Molecule: Combines 2-3 atoms
   - Organism: Complete feature combining molecules

2. **Follow the pattern**:

   ```typescript
   // atoms/myComponent.ts
   export function createMyComponent(
     element: HTMLElement,
     options: MyComponentOptions = {},
   ): MyComponentAPI {
     // Implementation
   }
   ```

3. **Export properly**:
   - Add types to `types/index.ts`
   - Export from `index.ts`

4. **Test thoroughly**:
   - Unit test in `__tests__/`
   - Add example usage to `examples/`

### Code Style

- Use existing utilities from `lib/`
- Prefer composition over inheritance
- Keep components focused and small
- Document public APIs with JSDoc

## Success Metrics

- ✅ Zero framework dependencies
- ✅ Clean atomic design structure
- ✅ Consistent factory pattern
- ✅ Shadow DOM isolation
- ✅ < 30KB gzipped
- ✅ Works in all modern browsers
- ✅ Full TypeScript support
- ✅ 100% vanilla JavaScript

## Resources

- [Atomic Design Methodology](https://atomicdesign.bradfrost.com/)
- [Shadow DOM v1 Spec](https://developers.google.com/web/fundamentals/web-components/shadowdom)
- [Factory Pattern in JavaScript](https://www.patterns.dev/posts/factory-pattern/)

---

_Last Updated: 2024-08-15_ _Version: 2.0.0_
