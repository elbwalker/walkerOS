# DestinationBox Implementation Plan

**Date**: 2025-10-27 **Status**: Planning Phase **Goal**: Extend MappingBox
pattern to support full Destination Config editing

---

## Executive Summary

Create a `DestinationBox` component that allows editing the **complete
destination configuration**, including:

- **settings** (destination-specific config)
- **mapping** (event-specific rules) ← MappingBox handles this
- **data** (global data transformations)
- **policy** (processing rules)
- **consent** (consent requirements)
- **loadScript**, **queue**, **verbose**, **onError**, **onLog** (additional
  options)

**Key Design Principle**: Reuse the existing tree navigation pattern from
MappingBox, treating the config object as a tree where properties become
navigable nodes.

---

## Current Architecture Analysis

### MappingBox Structure (What Works Well)

```typescript
// Current mapping structure
{
  product: {           // entity (depth 1)
    view: {            // action (depth 2) → rule
      name: 'view_item',      // rule property (depth 3)
      settings: { ... },      // rule property → map
      data: { map: { ... } }, // rule property → valueConfig → map
      consent: { ... },       // rule property → consent
    }
  }
}
```

**Navigation Pattern**:

1. Tree sidebar shows entity → action hierarchy
2. Clicking opens tabs with appropriate panes
3. Path-based navigation: `['product', 'view', 'data', 'map']`
4. Type detection determines which pane to show

**Core Reusable Components**:

- ✅ `useMappingState` - Path-based CRUD for any nested object
- ✅ `useMappingNavigation` - Tab management and breadcrumbs
- ✅ `mapping-path.ts` utilities - Generic path operations
- ✅ `type-detector.ts` - Schema-based type detection
- ✅ All pane components (map, loop, set, enum, boolean, etc.)

---

## DestinationBox Structure

### Target Config Structure

```typescript
// Full destination config (Destination.Config<T>)
{
  // 1. CONFIG-LEVEL SETTINGS (destination-specific)
  settings: {
    pixelId: '1234567890',           // Meta example
    ga4: { measurementId: 'G-XXX' }, // gtag example
  },

  // 2. EVENT MAPPING RULES (existing MappingBox)
  mapping: {
    product: {
      view: {
        name: 'view_item',
        settings: { ... },
        data: { map: { ... } },
      }
    }
  },

  // 3. GLOBAL DATA TRANSFORMATIONS
  data: {
    map: {
      user_id: 'user.id',
      session_id: 'user.session',
    }
  },

  // 4. PROCESSING POLICY
  policy: {
    'consent.marketing': true,
    'user.id': { fn: '(value) => value !== null' }
  },

  // 5. CONSENT REQUIREMENTS
  consent: {
    functional: true,
    marketing: false,
  },

  // 6. ADDITIONAL OPTIONS
  loadScript: true,
  queue: true,
  verbose: false,
  id: 'meta-pixel',
}
```

### Navigation Hierarchy

```
Overview (root)
├── Settings        (config.settings)
│   ├── pixelId    (string input)
│   ├── ga4        (object → map)
│   │   ├── measurementId
│   │   └── debug
│   └── ads        (object → map)
├── Mapping         (config.mapping) ← MappingBox pattern
│   ├── product
│   │   └── view
│   │       ├── name
│   │       ├── settings
│   │       └── data
│   └── order
├── Data            (config.data)
│   └── map        (global data mappings)
├── Policy          (config.policy)
│   ├── consent.marketing
│   └── user.id
├── Consent         (config.consent)
│   ├── functional
│   └── marketing
└── Options         (root-level config options)
    ├── loadScript
    ├── queue
    └── verbose
```

---

## Implementation Strategy

### Phase 1: Core Infrastructure ✅ (Already Exists)

**What We Can Reuse Directly**:

1. ✅ `useMappingState` → Rename to `useConfigState` (generic)
2. ✅ `useMappingNavigation` → Already generic (path-based)
3. ✅ `mapping-path.ts` utilities → Work with any object
4. ✅ All pane components → Generic, path-based
5. ✅ `type-detector.ts` → Schema-driven type detection

**Key Insight**: The infrastructure is already 90% generic! We mainly need to:

- Extend path detection for new root-level properties
- Add tree rendering for config structure
- Extend schema support for settings

### Phase 2: Tree Structure Extensions

**Current Tree**: Shows entity → action hierarchy

**New Tree**: Show config sections → nested properties

```typescript
// New tree node structure
interface ConfigTreeNode {
  key: string; // 'settings', 'mapping', 'data', etc.
  label: string; // 'Settings', 'Mapping', 'Data'
  path: string[]; // ['settings'] or ['mapping', 'product', 'view']
  type: NodeType; // Determines which pane opens
  children?: ConfigTreeNode[]; // Nested structure
  hasValue: boolean; // Show badge if configured
}
```

**Tree Building Logic**:

```typescript
function buildConfigTree(
  config: Destination.Config,
  schemas: DestinationSchemas,
): ConfigTreeNode[] {
  return [
    buildSettingsNode(config.settings, schemas.settings),
    buildMappingNode(config.mapping), // Reuse existing logic
    buildDataNode(config.data, schemas.data),
    buildPolicyNode(config.policy),
    buildConsentNode(config.consent),
    buildOptionsNode(config),
  ];
}
```

### Phase 3: Path Detection Extensions

**Current Detection** (from `getNodeTypeFromPath`):

```typescript
if (path.length === 1) return 'entity';
if (path.length === 2) return 'rule';
if (path[2] === 'name') return 'name';
// ... etc
```

**New Detection**:

```typescript
// Root-level config properties
if (path.length === 1) {
  if (path[0] === 'settings') return 'settings'; // NEW
  if (path[0] === 'mapping') return 'entity'; // Existing (mapping root)
  if (path[0] === 'data') return 'valueConfig'; // NEW
  if (path[0] === 'policy') return 'policy'; // Already exists
  if (path[0] === 'consent') return 'consent'; // NEW at root
  if (path[0] === 'options') return 'options'; // NEW
}

// Settings nested paths
if (path[0] === 'settings') {
  return detectFromValue(getValue(path), path, schemas?.settings);
}

// Mapping paths (existing logic continues)
if (path[0] === 'mapping') {
  // Shift path to remove 'mapping' prefix
  const mappingPath = path.slice(1);
  return detectMappingNodeType(mappingPath); // Existing logic
}
```

### Phase 4: New Pane Components

**Components Needed**:

1. **SettingsOverviewPane** - Shows settings tiles (like RuleOverview)
   - Tiles for each setting property
   - Uses `schemas.settings` for property suggestions
   - Badge shows current value

2. **OptionsPane** - Edits root-level config options
   - Toggle switches for `loadScript`, `queue`, `verbose`
   - Text input for `id`
   - Future: handlers for `onError`, `onLog`

**Components We Reuse**:

- ✅ MappingMapPaneViewRJSF (for settings.map, data.map)
- ✅ MappingConsentPaneView (for consent object)
- ✅ MappingPolicyOverviewPane (for policy)
- ✅ MappingEnumPaneView, MappingBooleanPaneView, etc.

### Phase 5: Schema Integration

**Current Schemas**:

```typescript
interface DestinationSchemas {
  settings?: RJSFSchema; // For config.settings
  settingsUi?: UiSchema;
  mapping?: RJSFSchema; // For rule.settings (confusing name!)
  mappingUi?: UiSchema;
  data?: RJSFSchema; // For rule.data and config.data
  dataUi?: UiSchema;
}
```

**Proposed Clarification** (consider for future):

```typescript
interface DestinationSchemas {
  // Config-level
  configSettings?: RJSFSchema; // For config.settings
  configSettingsUi?: UiSchema;

  // Rule-level
  ruleSettings?: RJSFSchema; // For mapping.*.*.settings
  ruleSettingsUi?: UiSchema;
  ruleData?: RJSFSchema; // For mapping.*.*.data
  ruleDataUi?: UiSchema;

  // Or keep current names for backward compatibility
  // and just be clear in docs
}
```

---

## Component Architecture

### DestinationBox Component

```typescript
interface DestinationBoxProps {
  config: Destination.Config<T>;
  onConfigChange?: (config: Destination.Config<T>) => void;
  label?: string;
  initialTab?: 'code' | 'visual';
  resizable?: boolean;
  showTree?: boolean;
  showHeader?: boolean;
  schemas?: DestinationSchemas;

  // NEW: Control which sections are editable
  sections?: {
    settings?: boolean;
    mapping?: boolean;
    data?: boolean;
    policy?: boolean;
    consent?: boolean;
    options?: boolean;
  };
}

export function DestinationBox({
  config,
  onConfigChange,
  schemas,
  sections = {
    /* all true by default */
  },
  ...props
}: DestinationBoxProps) {
  // Use generic hooks (same as MappingBox)
  const configState = useConfigState(config, onConfigChange);
  const navigation = useMappingNavigation(); // Already generic!

  // Build tree structure
  const treeNodes = useMemo(
    () => buildConfigTree(config, schemas, sections),
    [config, schemas, sections],
  );

  // Rest similar to MappingBox
}
```

### Tree Component Extensions

```typescript
// Extend existing tree to handle config structure
function ConfigTree({ nodes, navigation, configState }: ConfigTreeProps) {
  return (
    <div className="elb-config-tree">
      {nodes.map(node => (
        <ConfigTreeNode
          key={node.key}
          node={node}
          navigation={navigation}
          configState={configState}
        />
      ))}
    </div>
  );
}

function ConfigTreeNode({ node, navigation, configState }: NodeProps) {
  const hasValue = !!configState.getValue(node.path);
  const isActive = navigation.activeTab?.path.join('.') === node.path.join('.');

  return (
    <div className="elb-config-tree-node">
      <button
        className={isActive ? 'active' : ''}
        onClick={() => navigation.openTab(node.path, node.type)}
      >
        {node.label}
        {hasValue && <span className="badge">✓</span>}
      </button>

      {node.children && (
        <div className="elb-config-tree-children">
          {node.children.map(child => (
            <ConfigTreeNode key={child.key} node={child} {...props} />
          ))}
        </div>
      )}
    </div>
  );
}
```

---

## Implementation Phases

### Phase 1: Foundation (1-2 days)

- [ ] Create `DestinationBox` component skeleton
- [ ] Implement `buildConfigTree` function
- [ ] Extend path detection for root-level properties
- [ ] Test with simple config (just settings + mapping)

### Phase 2: Settings Section (1-2 days)

- [ ] Create `SettingsOverviewPane` component
- [ ] Integrate schema-driven property suggestions for settings
- [ ] Support nested settings (like `ga4.measurementId`)
- [ ] Test with Meta Pixel and gtag schemas

### Phase 3: Data & Policy Sections (1 day)

- [ ] Add `data` tree node and navigation
- [ ] Add `policy` tree node (reuse existing pane)
- [ ] Test global data transformations

### Phase 4: Consent & Options (1 day)

- [ ] Add `consent` root-level support
- [ ] Create `OptionsPane` for loadScript, queue, verbose
- [ ] Test full config editing

### Phase 5: Demo & Documentation (1 day)

- [ ] Create comprehensive demo
- [ ] Document component API
- [ ] Add usage examples
- [ ] Update SCHEMA.md

### Phase 6: Abstraction & Cleanup (Future)

- [ ] Extract shared patterns between MappingBox and DestinationBox
- [ ] Consider creating `GenericConfigBox` base
- [ ] Refactor for DRY where beneficial

---

## File Structure

```
apps/explorer/src/components/
├── organisms/
│   ├── mapping-box.tsx              # Keep as-is
│   ├── destination-box.tsx          # NEW
│   ├── config-tree.tsx              # NEW (or extend mapping-tree)
│   └── mapping-editor-tabs.tsx      # Reuse/extend
├── molecules/
│   ├── settings-overview-pane.tsx   # NEW
│   ├── options-pane.tsx             # NEW
│   └── (all existing panes reused)
└── utils/
    ├── config-tree-builder.ts       # NEW
    └── (all existing utils reused)

apps/explorer/demo/
└── destination-box-demo.tsx         # NEW demo
```

---

## Key Challenges & Solutions

### Challenge 1: Path Ambiguity

**Problem**: Path `['consent']` could mean:

- Root-level consent requirement: `config.consent`
- Rule-level consent: `mapping.product.view.consent`

**Solution**: Use path[0] to determine context:

```typescript
if (path[0] === 'mapping') {
  // Rule-level navigation
} else if (path[0] === 'consent') {
  // Root-level consent
}
```

### Challenge 2: Schema Reuse

**Problem**: `schemas.data` is used for both:

- Rule-level: `mapping.product.view.data`
- Config-level: `config.data`

**Solution**: This is actually fine! Same schema for both contexts. The path
detection handles routing to correct pane.

### Challenge 3: Tree Complexity

**Problem**: Config tree is more complex than entity→action hierarchy

**Solution**:

- Lazy-load tree nodes (don't expand everything)
- Add search/filter functionality
- Use visual grouping (sections)

### Challenge 4: Backward Compatibility

**Problem**: Changing `DestinationSchemas` interface breaks existing code

**Solution**:

- Keep interface as-is for Phase 1
- Add optional clarifications in Phase 6
- Document naming conventions clearly

---

## Testing Strategy

### Unit Tests

- `buildConfigTree()` with various config shapes
- Path detection for new root-level properties
- Schema-based type detection for settings

### Integration Tests

- Full config CRUD operations
- Navigation between sections
- Schema-driven property suggestions

### E2E Tests

- Edit settings → mapping → data → policy
- Code/Visual view switching
- Import/export full config

---

## Success Criteria

- [ ] Can edit complete Destination.Config object
- [ ] Settings use schema for property suggestions
- [ ] All sections navigable via tree
- [ ] Code view shows full config
- [ ] Backward compatible with MappingBox
- [ ] Demo shows Meta Pixel + gtag full config
- [ ] Documentation complete
- [ ] All tests passing

---

## Next Steps

1. **Review this plan** - Discuss and refine
2. **Create POC** - Simple DestinationBox with just settings + mapping
3. **Iterate** - Add sections incrementally
4. **Abstract** - Extract common patterns later

---

## Open Questions

1. Should we support editing `onError` and `onLog` functions?
   - Decision: Start with display-only, add editing later if needed

2. How to handle environment (`env`) properties?
   - Decision: Display-only in Phase 1, potentially editable mock env later

3. Should MappingBox become a wrapper?
   - Decision: No, keep separate. Learn from implementation, abstract later.

4. Naming: Keep "Mapping" terminology in shared code?
   - Decision: Yes for now, rename in abstraction phase if needed

---

## Timeline Estimate

**Total: 5-7 days for complete implementation**

- Phase 1-2: 3 days (foundation + settings)
- Phase 3-4: 2 days (data + policy + consent + options)
- Phase 5: 1 day (demo + docs)
- Phase 6: Future (abstraction)

**First Milestone**: POC with settings + mapping (2 days)
