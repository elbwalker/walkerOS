# Generic Visual Editor Component - Deep Analysis & Implementation Plan

## Executive Summary

**YES, it is absolutely possible** to create a generic visual editor component
that works at ANY level of the walkerOS configuration hierarchy. The current
architecture is already 95% there - we just need to extract and generalize the
pattern.

**Complexity Assessment**: MEDIUM

- Core abstraction: 3-5 days
- Testing & edge cases: 2-3 days
- Migration of existing boxes: 1-2 days
- **Total: 1-2 weeks**

The key insight: **DestinationBox and MappingBox already share 95% of their
code**. They differ only in:

1. Initial config shape (Destination.Config vs Mapping.Rules)
2. Section visibility configuration
3. Schema structure definitions

Everything else - navigation, tree building, pane routing, state management - is
identical.

---

## Current Architecture Analysis

### The Visual Editor Pattern (Already Implemented)

```
┌─────────────────────────────────────────────────────────┐
│                    Box Component                         │
│  ┌────────────┐                                          │
│  │ Code/Visual│ Toggle                                   │
│  └────────────┘                                          │
│                                                           │
│  ┌──────────────────────────────────────────────────┐   │
│  │          EditorTabs Component                     │   │
│  │  ┌─────────────────────────────────────────────┐ │   │
│  │  │  Navigation Header (breadcrumb, validation) │ │   │
│  │  └─────────────────────────────────────────────┘ │   │
│  │  ┌──────┐  ┌──────────────────────────────────┐ │   │
│  │  │ Tree │  │         Active Pane              │ │   │
│  │  │      │  │  (determined by NodeType)        │ │   │
│  │  │      │  │                                  │ │   │
│  │  └──────┘  └──────────────────────────────────┘ │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### Core Abstraction Layers

**Layer 1: State Management** ✅ FULLY GENERIC

- `useMappingState(config, onChange)` - Already works with ANY config shape
- Path-based CRUD operations
- Immutable updates
- Works at any depth: `['settings', 'pixelId']` or
  `['mapping', 'page', 'view', 'name']`

**Layer 2: Navigation** ✅ FULLY GENERIC

- `useMappingNavigation()` - No config dependencies
- Tab management
- Breadcrumb generation
- Tree visibility

**Layer 3: Type Detection** ✅ 90% GENERIC

- `detectNodeType(value, path, schemas)` - Already schema-driven
- Works at any level
- Only needs: schema structure definition for each config type

**Layer 4: Tree Building** ✅ 80% GENERIC

- `buildConfigTree()` for DestinationConfig
- `buildMappingTree()` for MappingConfig (implicit in MappingTreeSidebar)
- Both iterate actual config (not schema)
- **Gap**: Need unified tree builder that works with structure definitions

**Layer 5: Pane Routing** ✅ FULLY GENERIC

- `MappingPane` router already handles all NodeTypes
- Each pane receives: `path`, `mappingState`, `navigation`, `schemas`
- Panes don't care about hierarchy level

**Layer 6: Visual/Code Toggle** ✅ FULLY GENERIC

- Box wrapper pattern works at any level
- CodeBox shows `JSON.stringify(config)` for current path
- Navigation state persists across switches

---

## The Unified Pattern

### What's the Same (95% of code):

```typescript
// ALL boxes follow this pattern:
function SomeBox({ config, onChange, schemas, ... }) {
  const [activeTab, setActiveTab] = useState('visual');
  const [navigationState, setNavigationState] = useState(null);

  return (
    <Box header={label} headerActions={<ButtonGroup ... />}>
      {activeTab === 'code' ? (
        <CodeBox code={JSON.stringify(config)} onChange={...} />
      ) : (
        <SomeEditorTabs
          config={config}
          onChange={onChange}
          schemas={schemas}
          navigationState={navigationState}
          onNavigationChange={setNavigationState}
        />
      )}
    </Box>
  );
}

function SomeEditorTabs({ config, onChange, schemas }) {
  const mappingState = useMappingState(config, onChange);
  const navigation = useMappingNavigation();
  const treeState = useTreeState([]);

  return (
    <div className="elb-mapping-editor-tabs">
      <TreeSidebar tree={buildTree(config, schemas)} ... />
      <div className="elb-mapping-editor-main">
        <NavigationHeader ... />
        <MappingPane
          nodeType={activeTab.nodeType}
          path={activeTab.path}
          mappingState={mappingState}
          navigation={navigation}
          schemas={schemas}
        />
      </div>
    </div>
  );
}
```

### What's Different (5% of code):

| Aspect           | DestinationBox                                                                             | MappingBox                             |
| ---------------- | ------------------------------------------------------------------------------------------ | -------------------------------------- |
| Config Type      | `Destination.Config<T>`                                                                    | `Mapping.Config`                       |
| Root Properties  | `settings`, `mapping`, `data`, `policy`, `consent`, `id`, `loadScript`, `queue`, `verbose` | `mapping`, `data`, `policy`, `consent` |
| Sections Config  | `DestinationBoxSections`                                                                   | N/A (all sections visible)             |
| Structure Schema | `destinationConfigStructureSchema`                                                         | Implicit (entity → action pattern)     |
| Tree Builder     | `buildConfigTree()`                                                                        | Embedded in MappingTreeSidebar         |

**Key Insight**: These differences are just CONFIGURATION, not logic!

---

## The Generic Solution: ConfigEditor Component

### Core Concept

Create a **meta-configurable** editor where the config structure itself is
described by a schema:

```typescript
interface ConfigStructure {
  // Describes the SHAPE of the config, not the values
  properties: {
    [key: string]: {
      title: string;
      type: 'object' | 'array' | 'primitive' | 'special';
      nodeType?: NodeType; // How to edit this property
      children?: 'dynamic' | 'entity-action' | 'schema-driven';
    };
  };
}
```

### Implementation Architecture

```
┌────────────────────────────────────────────────────────┐
│            ConfigEditor<T> (GENERIC)                    │
│  Props:                                                 │
│  - config: T                                            │
│  - onChange?: (config: T) => void                       │
│  - structure: ConfigStructure                           │
│  - schemas?: SchemaBundle                               │
│  - sections?: SectionVisibility                         │
│  ────────────────────────────────────────────────────  │
│  Delegates to:                                          │
│  ├─ ConfigEditorBox (wrapper with Code/Visual toggle)  │
│  └─ ConfigEditorTabs (main editor)                      │
│      ├─ ConfigTreeBuilder (unified tree logic)         │
│      ├─ useMappingState (already generic)              │
│      ├─ useMappingNavigation (already generic)         │
│      └─ MappingPane (already generic)                  │
└────────────────────────────────────────────────────────┘
```

### Usage Examples

```typescript
// Example 1: Full DestinationConfig
<ConfigEditor
  config={destinationConfig}
  onChange={setDestinationConfig}
  structure={DESTINATION_CONFIG_STRUCTURE}
  schemas={metaPixelSchemas}
  sections={{ loadScript: false, verbose: false }}
/>

// Example 2: Just a mapping rule (mapping.page.view)
<ConfigEditor
  config={pageViewRule}
  onChange={setPageViewRule}
  structure={MAPPING_RULE_STRUCTURE}
  schemas={metaPixelSchemas.mapping}
/>

// Example 3: Deep nested path (mapping.page.view.data.map)
<ConfigEditor
  config={mapObject}
  onChange={setMapObject}
  structure={VALUE_CONFIG_MAP_STRUCTURE}
/>

// Example 4: Settings object
<ConfigEditor
  config={settings}
  onChange={setSettings}
  structure={SETTINGS_STRUCTURE}
  schemas={metaPixelSchemas.settings}
/>
```

---

## Detailed Implementation Plan

### Phase 1: Define Config Structure Schema (1 day)

**Goal**: Create meta-schema that describes config shapes

**Files to Create**:

```
apps/explorer/src/schemas/
├── config-structures/
│   ├── index.ts
│   ├── destination-config.ts     # Destination.Config structure
│   ├── mapping-config.ts          # Mapping.Config structure
│   ├── mapping-rule.ts            # Individual Rule structure
│   ├── value-config.ts            # ValueConfig structure
│   └── primitives.ts              # Boolean, string, number structures
```

**Structure Definition Format**:

```typescript
export interface ConfigStructureDef {
  type: 'object' | 'array' | 'primitive';
  properties?: {
    [key: string]: PropertyDef;
  };
  // Special handling
  patterns?: {
    'entity-action'?: boolean; // mapping.{entity}.{action}
    'dynamic-keys'?: boolean; // map.{any-key}
  };
}

interface PropertyDef {
  title?: string;
  description?: string;
  nodeType?: NodeType; // Override detection
  schemaPath?: string; // Path in schemas bundle
  children?: 'schema-driven' | 'value-driven' | 'entity-action';
}
```

**Example - Destination Config Structure**:

```typescript
export const DESTINATION_CONFIG_STRUCTURE: ConfigStructureDef = {
  type: 'object',
  properties: {
    settings: {
      title: 'Settings',
      nodeType: 'settings', // Shows overview pane
      children: 'schema-driven', // Build from schemas.settings
    },
    mapping: {
      title: 'Mapping',
      nodeType: 'entity',
      children: 'entity-action', // Special: mapping.{entity}.{action} pattern
    },
    data: {
      title: 'Data',
      children: 'value-driven', // Detect from actual value
    },
    policy: {
      title: 'Policy',
      nodeType: 'policy',
    },
    consent: {
      title: 'Consent',
      nodeType: 'consent',
    },
    id: {
      title: 'ID',
      nodeType: 'primitive',
      schemaPath: 'id',
    },
    loadScript: {
      title: 'Load Script',
      nodeType: 'boolean',
      schemaPath: 'loadScript',
    },
  },
};
```

**Example - Mapping Rule Structure**:

```typescript
export const MAPPING_RULE_STRUCTURE: ConfigStructureDef = {
  type: 'object',
  properties: {
    name: {
      title: 'Event Name',
      nodeType: 'name',
      schemaPath: 'rule.name',
    },
    batch: {
      title: 'Batch Size',
      nodeType: 'batch',
      schemaPath: 'rule.batch',
    },
    settings: {
      title: 'Settings',
      children: 'schema-driven',
      schemaPath: 'mapping', // Use schemas.mapping
    },
    data: {
      title: 'Data',
      children: 'value-driven',
    },
    consent: {
      title: 'Consent',
      nodeType: 'consent',
    },
    condition: {
      title: 'Condition',
      nodeType: 'condition',
    },
    ignore: {
      title: 'Ignore',
      nodeType: 'boolean',
    },
  },
};
```

**Migration Strategy**:

- Extract from `destination-config-structure.ts`
- Generalize `destinationConfigStructureSchema` → `DESTINATION_CONFIG_STRUCTURE`
- Create equivalent for other config types

---

### Phase 2: Unified Tree Builder (2 days)

**Goal**: Single tree builder that works with any structure definition

**Current Situation**:

- `buildConfigTree()` - hardcoded for DestinationConfig
- `buildMappingChildren()` - hardcoded entity→action pattern
- `buildSettingsChildren()` - hardcoded settings iteration

**New Implementation**:

```typescript
// apps/explorer/src/utils/generic-tree-builder.ts

export function buildTree<T extends Record<string, unknown>>(
  config: T,
  structure: ConfigStructureDef,
  schemas?: Record<string, RJSFSchema>,
  sections?: Record<string, boolean>,
): ConfigTreeNode[] {
  const nodes: ConfigTreeNode[] = [];

  // Iterate actual config keys (config-driven, not schema-driven)
  const configKeys = Object.keys(config).filter(
    (key) => config[key] !== undefined,
  );

  for (const key of configKeys) {
    // Check section visibility
    if (sections?.[key] === false) continue;

    const propertyDef = structure.properties?.[key];
    const value = config[key];

    // Determine NodeType
    const nodeType = propertyDef?.nodeType || detectFromValue(value);

    // Build node
    const node: ConfigTreeNode = {
      key,
      label: propertyDef?.title || capitalize(key),
      path: [key],
      type: nodeType,
      hasValue: true,
    };

    // Build children based on children strategy
    if (propertyDef?.children === 'entity-action') {
      node.children = buildEntityActionChildren(value, [key]);
      node.isExpandable = true;
    } else if (propertyDef?.children === 'schema-driven') {
      const propSchema = getSchemaForPath([key], schemas);
      node.children = buildSchemaChildren(value, [key], propSchema);
      node.isExpandable = node.children.length > 0;
    } else if (propertyDef?.children === 'value-driven') {
      node.children = buildValueChildren(value, [key]);
      node.isExpandable = node.children.length > 0;
    } else {
      node.isExpandable = false;
    }

    nodes.push(node);
  }

  return nodes;
}

function buildEntityActionChildren(
  mapping: Record<string, Record<string, unknown>>,
  basePath: string[],
): ConfigTreeNode[] {
  // Special: mapping.{entity}.{action} pattern
  const children: ConfigTreeNode[] = [];

  Object.keys(mapping).forEach((entity) => {
    const actions = mapping[entity];
    const actionNodes: ConfigTreeNode[] = [];

    if (actions && typeof actions === 'object') {
      Object.keys(actions).forEach((action) => {
        actionNodes.push({
          key: action,
          label: capitalize(action),
          path: [...basePath, entity, action],
          type: 'rule',
          hasValue: true,
          isExpandable: false,
        });
      });
    }

    children.push({
      key: entity,
      label: capitalize(entity),
      path: [...basePath, entity],
      type: 'entity',
      hasValue: true,
      children: actionNodes,
      isExpandable: actionNodes.length > 0,
    });
  });

  return children;
}

function buildSchemaChildren(
  obj: Record<string, unknown>,
  basePath: string[],
  schema?: RJSFSchema,
): ConfigTreeNode[] {
  // Build from actual config values only (not schema possibilities)
  const children: ConfigTreeNode[] = [];

  Object.keys(obj)
    .filter((key) => obj[key] !== undefined)
    .forEach((key) => {
      const propSchema = schema?.properties?.[key];
      children.push({
        key,
        label: (propSchema as RJSFSchema)?.title || capitalize(key),
        path: [...basePath, key],
        type: detectFromJsonSchema(propSchema as RJSFSchema) || 'valueConfig',
        hasValue: true,
        isExpandable: false,
      });
    });

  return children;
}

function buildValueChildren(
  value: unknown,
  basePath: string[],
): ConfigTreeNode[] {
  // Detect children from value structure
  // For objects: show properties
  // For arrays: might show indices or not expand
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    const obj = value as Record<string, unknown>;
    return Object.keys(obj).map((key) => ({
      key,
      label: capitalize(key),
      path: [...basePath, key],
      type: detectFromValue(obj[key]),
      hasValue: true,
      isExpandable: false,
    }));
  }

  return [];
}
```

**Key Features**:

- Works at ANY depth (not just root level)
- Config-driven (tree reflects actual JSON)
- Structure-aware (uses PropertyDef for metadata)
- Supports all child patterns:
  - `entity-action`: Special mapping pattern
  - `schema-driven`: Build from JSON Schema properties
  - `value-driven`: Detect from value structure

---

### Phase 3: Generic ConfigEditor Component (2 days)

**Goal**: Unified editor that replaces all Box/EditorTabs pairs

**File Structure**:

```
apps/explorer/src/components/organisms/
├── config-editor/
│   ├── index.ts
│   ├── config-editor.tsx          # Main export
│   ├── config-editor-box.tsx      # Box wrapper (Code/Visual toggle)
│   └── config-editor-tabs.tsx     # Editor tabs (tree + panes)
```

**Implementation**:

```typescript
// config-editor.tsx
export interface ConfigEditorProps<T extends Record<string, unknown>> {
  // Core
  config: T;
  onChange?: (config: T) => void;

  // Structure definition (tells us HOW to edit this config)
  structure: ConfigStructureDef;

  // Schemas (tells us WHAT values are valid)
  schemas?: Record<string, RJSFSchema>;
  uiSchemas?: Record<string, UiSchema>;

  // Configuration
  sections?: Record<string, boolean>; // Which sections to show

  // UI
  label?: string;
  className?: string;
  initialTab?: 'code' | 'visual';
  resizable?: boolean;
  showTree?: boolean;
  showHeader?: boolean;

  // Navigation persistence
  initialNavigationState?: NavigationState;
  onNavigationStateChange?: (state: NavigationState) => void;
}

export function ConfigEditor<T extends Record<string, unknown>>({
  config,
  onChange,
  structure,
  schemas,
  uiSchemas,
  sections = {},
  label = 'Configuration',
  className = '',
  initialTab = 'visual',
  resizable = false,
  showTree = true,
  showHeader = true,
  initialNavigationState,
  onNavigationStateChange,
}: ConfigEditorProps<T>) {
  return (
    <ConfigEditorBox
      config={config}
      onChange={onChange}
      structure={structure}
      schemas={schemas}
      uiSchemas={uiSchemas}
      sections={sections}
      label={label}
      className={className}
      initialTab={initialTab}
      resizable={resizable}
      showTree={showTree}
      showHeader={showHeader}
      initialNavigationState={initialNavigationState}
      onNavigationStateChange={onNavigationStateChange}
    />
  );
}
```

```typescript
// config-editor-box.tsx
function ConfigEditorBox<T>({ ... }: ConfigEditorProps<T>) {
  const [activeTab, setActiveTab] = useState<'code' | 'visual'>(initialTab);
  const [persistedNavigationState, setPersistedNavigationState] = useState(null);

  const configJson = useMemo(() => JSON.stringify(config, null, 2), [config]);

  return (
    <Box
      header={label}
      headerActions={<ButtonGroup buttons={buttons} onButtonClick={handleTabChange} />}
      className={className}
      resizable={resizable}
      showHeader={showHeader}
    >
      {activeTab === 'code' ? (
        <CodeBox
          code={configJson}
          language="json"
          onChange={onChange ? handleCodeChange : undefined}
        />
      ) : (
        <ConfigEditorTabs
          config={config}
          onChange={onChange}
          structure={structure}
          schemas={schemas}
          uiSchemas={uiSchemas}
          sections={sections}
          showTree={showTree}
          initialNavigationState={persistedNavigationState}
          onNavigationStateChange={handleNavigationChange}
        />
      )}
    </Box>
  );
}
```

```typescript
// config-editor-tabs.tsx
function ConfigEditorTabs<T>({ config, onChange, structure, schemas, ... }) {
  // State hooks (already generic!)
  const mappingState = useMappingState(config as any, onChange as any);
  const navigation = useMappingNavigation();
  const treeState = useTreeState(initialNavigationState?.expandedPaths || [[]]);
  const [codeViewActive, setCodeViewActive] = useState(false);

  // Build tree using unified tree builder
  const configTree = useMemo(
    () => buildTree(config, structure, schemas, sections),
    [config, structure, schemas, sections],
  );

  // Validate config
  const validationErrors = useMemo(
    () => validateConfig(config, schemas),
    [config, schemas],
  );

  const activeTab = navigation.openTabs.find(
    tab => tab.id === navigation.activeTabId
  );

  return (
    <div className="elb-mapping-editor-tabs">
      {/* Tree Sidebar */}
      {showTree && navigation.treeVisible && (
        <ConfigTreeSidebar
          tree={configTree}
          currentPath={activeTab?.path || []}
          expandedPaths={treeState.expandedPaths}
          onToggle={treeState.togglePath}
          onNavigate={(path) => {
            const nodeType = getNodeTypeFromPath(path, mappingState, structure, schemas);
            navigation.openTab(path, nodeType);
          }}
          onClose={() => navigation.setTreeVisible(false)}
        />
      )}

      {/* Main Editor */}
      <div className="elb-mapping-editor-main">
        <MappingNavigationHeader
          breadcrumb={navigation.breadcrumb}
          validationErrors={validationErrors.length}
          onValidationClick={() => navigation.openTab([], 'validationOverview')}
          {...navigationProps}
        />

        <div className="elb-mapping-editor-content">
          {codeViewActive ? (
            <CodeBox code={currentCode} onChange={handleCodeChange} />
          ) : activeTab ? (
            activeTab.nodeType === 'validationOverview' ? (
              <ValidationOverviewPane errors={validationErrors} navigation={navigation} />
            ) : (
              <MappingPane
                nodeType={activeTab.nodeType}
                path={activeTab.path}
                mappingState={mappingState}
                navigation={navigation}
                schemas={schemas}
              />
            )
          ) : (
            <ConfigOverviewPane
              config={config}
              structure={structure}
              navigation={navigation}
              schemas={schemas}
            />
          )}
        </div>
      </div>
    </div>
  );
}
```

**Key Changes from Current**:

1. Generic type parameter `<T>` instead of hardcoded types
2. `structure` prop replaces hardcoded structure schemas
3. Unified `buildTree()` instead of specific builders
4. Generic `getNodeTypeFromPath()` using structure definition

---

### Phase 4: Enhance Type Detection (1 day)

**Goal**: Make type detection work with structure definitions

**Current**: `getNodeTypeFromPath(path, mappingState, schemas)` **New**:
`getNodeTypeFromPath(path, mappingState, structure, schemas)`

```typescript
function getNodeTypeFromPath(
  path: string[],
  mappingState: UseMappingStateReturn,
  structure: ConfigStructureDef,
  schemas?: Record<string, RJSFSchema>,
): NodeType {
  // Empty path → use structure root type or 'entity'
  if (path.length === 0) {
    return structure.rootNodeType || 'entity';
  }

  // Navigate structure definition
  let currentDef: PropertyDef | undefined;
  let currentStructure = structure;

  for (let i = 0; i < path.length; i++) {
    const segment = path[i];
    currentDef = currentStructure.properties?.[segment];

    if (!currentDef) break;

    // If this property has nested structure, continue
    if (currentDef.structure) {
      currentStructure = currentDef.structure;
    }
  }

  // Priority 1: Explicit nodeType in structure definition
  if (currentDef?.nodeType) {
    return currentDef.nodeType;
  }

  // Priority 2: Handle special patterns
  if (currentDef?.children === 'entity-action') {
    // mapping.{entity}.{action} pattern
    if (path.length === currentDef.depth + 1) return 'entity';
    if (path.length === currentDef.depth + 2) return 'rule';
  }

  // Priority 3: Schema-driven detection
  const value = mappingState.actions.getValue(path);
  const schema = getSchemaForPath(path, schemas);
  return detectNodeType(value, path, schema);
}
```

**Enhancements**:

- Structure definition takes precedence
- Falls back to value/schema detection
- Supports nested structure definitions
- Handles special patterns (entity-action)

---

### Phase 5: Create Config Overview Pane (1 day)

**Goal**: Generic overview showing available properties

**Current**: `DestinationConfigOverviewPane` - hardcoded for destination
**New**: `ConfigOverviewPane` - works with any structure

```typescript
// apps/explorer/src/components/molecules/config-overview-pane.tsx

export interface ConfigOverviewPaneProps<T extends Record<string, unknown>> {
  config: T;
  structure: ConfigStructureDef;
  navigation: UseMappingNavigationReturn;
  schemas?: Record<string, RJSFSchema>;
  className?: string;
}

export function ConfigOverviewPane<T>({
  config,
  structure,
  navigation,
  schemas,
  className = '',
}: ConfigOverviewPaneProps<T>) {
  const properties = Object.keys(structure.properties || {});

  // Separate configured vs available
  const configuredProperties = properties.filter(
    key => config[key as keyof T] !== undefined
  );

  const availableProperties = properties.filter(
    key => config[key as keyof T] === undefined
  );

  const handlePropertyClick = (key: string) => {
    const propertyDef = structure.properties![key];
    const nodeType = propertyDef.nodeType || 'valueConfig';
    navigation.openTab([key], nodeType as NodeType);
  };

  return (
    <BaseMappingPane title={structure.title || 'Configuration'}>
      {/* Configured properties as tiles */}
      <div className="elb-mapping-rule-section-grid">
        {configuredProperties.map(key => {
          const propertyDef = structure.properties![key];
          return (
            <RuleTile
              key={key}
              label={propertyDef.title || key}
              description={propertyDef.description}
              status={getPropertyStatus(config[key as keyof T])}
              onClick={() => handlePropertyClick(key)}
            />
          );
        })}
      </div>

      {/* Available properties */}
      {availableProperties.length > 0 && (
        <div className="elb-mapping-rule-section">
          <h3>Available Properties</h3>
          <div className="elb-mapping-rule-section-grid">
            {availableProperties.map(key => {
              const propertyDef = structure.properties![key];
              return (
                <RuleTile
                  key={key}
                  label={propertyDef.title || key}
                  description={propertyDef.description}
                  status={{ enabled: false, text: 'Not set' }}
                  onClick={() => handlePropertyClick(key)}
                />
              );
            })}
          </div>
        </div>
      )}
    </BaseMappingPane>
  );
}
```

---

### Phase 6: Migration & Backward Compatibility (1 day)

**Goal**: Replace existing boxes with ConfigEditor while maintaining API

**Strategy**: Create wrapper components that use ConfigEditor internally

```typescript
// apps/explorer/src/components/organisms/destination-box.tsx

export function DestinationBox<T extends Destination.TypesGeneric = Destination.Types>({
  config,
  onConfigChange,
  schemas,
  sections,
  ...rest
}: DestinationBoxProps<T>) {
  // Convert DestinationSchemas to generic schemas
  const genericSchemas = {
    settings: schemas?.settings,
    settingsUi: schemas?.settingsUi,
    mapping: schemas?.mapping,
    mappingUi: schemas?.mappingUi,
    data: schemas?.data,
    dataUi: schemas?.dataUi,
  };

  return (
    <ConfigEditor
      config={config as Record<string, unknown>}
      onChange={onConfigChange as ((c: Record<string, unknown>) => void) | undefined}
      structure={DESTINATION_CONFIG_STRUCTURE}
      schemas={genericSchemas}
      sections={sections}
      {...rest}
    />
  );
}
```

```typescript
// apps/explorer/src/components/organisms/mapping-box.tsx

export function MappingBox({
  mapping,
  onMappingChange,
  schemas,
  ...rest
}: MappingBoxProps) {
  return (
    <ConfigEditor
      config={mapping as Record<string, unknown>}
      onChange={onMappingChange as ((c: Record<string, unknown>) => void) | undefined}
      structure={MAPPING_CONFIG_STRUCTURE}
      schemas={schemas}
      {...rest}
    />
  );
}
```

**Benefits**:

- Existing API unchanged
- All components immediately benefit from improvements
- Can deprecate old implementations gradually

---

## Advanced Use Cases

### Use Case 1: Edit a Single Rule

```typescript
// Edit just mapping.page.view
const pageViewRule = destinationConfig.mapping?.page?.view;

<ConfigEditor
  config={pageViewRule}
  onChange={(newRule) => {
    setDestinationConfig({
      ...destinationConfig,
      mapping: {
        ...destinationConfig.mapping,
        page: {
          ...destinationConfig.mapping?.page,
          view: newRule,
        },
      },
    });
  }}
  structure={MAPPING_RULE_STRUCTURE}
  schemas={{
    mapping: metaPixelSchemas.mapping, // Rule-level settings schema
  }}
  label="Page View Rule"
/>
```

**Why This Works**:

- `MAPPING_RULE_STRUCTURE` describes a Rule shape
- ConfigEditor doesn't care about hierarchy
- Works at any depth: entire config or nested object

### Use Case 2: Edit ValueConfig.map

```typescript
// Edit just the map object inside data
const mapObject = rule.data?.map;

<ConfigEditor
  config={mapObject}
  onChange={(newMap) => {
    // Update just the map
    updateRuleDataMap(newMap);
  }}
  structure={VALUE_CONFIG_MAP_STRUCTURE}
  label="Map Transformation"
/>
```

**Structure Definition**:

```typescript
const VALUE_CONFIG_MAP_STRUCTURE: ConfigStructureDef = {
  type: 'object',
  properties: {}, // Dynamic keys
  patterns: {
    'dynamic-keys': true, // Any key allowed
  },
  childrenStrategy: 'value-driven', // Detect from values
};
```

### Use Case 3: Embed in Other Components

```typescript
// In a modal, showing just consent settings
<Modal title="Consent Configuration">
  <ConfigEditor
    config={destinationConfig.consent}
    onChange={(newConsent) => {
      setDestinationConfig({
        ...destinationConfig,
        consent: newConsent,
      });
    }}
    structure={CONSENT_STRUCTURE}
    showTree={false}
    showHeader={false}
  />
</Modal>
```

### Use Case 4: Custom Config Types

```typescript
// Not even walkerOS-specific!
interface MyCustomConfig {
  database: {
    host: string;
    port: number;
    ssl: boolean;
  };
  features: {
    analytics: boolean;
    reporting: boolean;
  };
}

const MY_CONFIG_STRUCTURE: ConfigStructureDef = {
  type: 'object',
  properties: {
    database: {
      title: 'Database',
      children: 'schema-driven',
    },
    features: {
      title: 'Features',
      children: 'schema-driven',
    },
  },
};

<ConfigEditor
  config={myConfig}
  onChange={setMyConfig}
  structure={MY_CONFIG_STRUCTURE}
  schemas={myConfigSchemas}
/>
```

---

## Deep Dive: How It Works

### Example: Editing `mapping.page.view.batch`

**User Journey**:

1. Opens DestinationBox with full config
2. Tree shows: Settings, Mapping, Data, Policy, ...
3. Expands Mapping → Page → View
4. Clicks "Batch" (value: 1000)
5. Sees batch pane with number input

**Under the Hood**:

```
1. Initial Render
   ├─ ConfigEditor receives: config (full DestinationConfig)
   ├─ Uses: DESTINATION_CONFIG_STRUCTURE
   └─ Builds tree: buildTree(config, structure, schemas)
       └─ Mapping node: uses 'entity-action' children strategy
           └─ Builds: mapping → page → view hierarchy

2. User Clicks "Batch"
   ├─ Tree emits: onNavigate(['mapping', 'page', 'view', 'batch'])
   ├─ ConfigEditorTabs calls: getNodeTypeFromPath(path, ...)
   │   ├─ Structure check: DESTINATION_CONFIG_STRUCTURE.properties.mapping
   │   │   └─ Children: 'entity-action' → knows it's a rule path
   │   ├─ Path length 4 → property within rule
   │   ├─ Property key: 'batch'
   │   └─ Returns: 'batch' (from rule-properties-schema)
   └─ navigation.openTab(['mapping', 'page', 'view', 'batch'], 'batch')

3. Render Batch Pane
   ├─ MappingPane receives: nodeType='batch', path=['mapping','page','view','batch']
   ├─ Routes to: MappingBatchPaneView
   ├─ Pane calls: mappingState.actions.getValue(path)
   │   └─ Traverses: config.mapping.page.view.batch → 1000
   └─ Renders: Number input with validation

4. User Changes Value
   ├─ Pane calls: mappingState.actions.setValue(path, 2000)
   ├─ useMappingState: Updates config immutably
   │   └─ setValueAtPath(config, ['mapping','page','view','batch'], 2000)
   ├─ Calls: onChange(newConfig)
   └─ ConfigEditor propagates to parent
```

**Key Insight**: The path `['mapping', 'page', 'view', 'batch']` works the same
whether:

- You're editing the full DestinationConfig
- Just the mapping object
- Just the page.view rule
- Or any other level

The only thing that changes is the **starting config** and **structure
definition**.

---

## Schema Management

### Current Schema Pattern

```typescript
interface DestinationSchemas {
  settings?: RJSFSchema; // Config-level settings
  settingsUi?: UiSchema;
  mapping?: RJSFSchema; // Rule-level settings
  mappingUi?: UiSchema;
  data?: RJSFSchema; // Event data properties
  dataUi?: UiSchema;
}
```

### Enhanced Schema Pattern

```typescript
interface SchemaBundle {
  // Root-level schemas by path
  [path: string]: {
    schema?: RJSFSchema;
    uiSchema?: UiSchema;
  };
}

// Example usage
const metaPixelSchemas: SchemaBundle = {
  settings: {
    schema: {
      type: 'object',
      properties: { pixelId: { type: 'string', pattern: '^[0-9]+$' } },
    },
    uiSchema: { pixelId: { 'ui:help': 'Your Meta Pixel ID' } },
  },
  mapping: {
    schema: { type: 'object', properties: { track: { type: 'boolean' } } },
  },
  id: {
    schema: { type: 'string', minLength: 1 },
  },
};

// Schema lookup
function getSchemaForPath(
  path: string[],
  schemas: SchemaBundle,
): RJSFSchema | undefined {
  // Try exact path
  const pathKey = path.join('.');
  if (schemas[pathKey]) return schemas[pathKey].schema;

  // Try parent paths (for nested properties)
  // ['settings', 'pixelId'] → try 'settings.pixelId', then 'settings'
  for (let i = path.length; i > 0; i--) {
    const parentKey = path.slice(0, i).join('.');
    const parentBundle = schemas[parentKey];
    if (parentBundle?.schema) {
      // Navigate schema
      return navigateSchema(parentBundle.schema, path.slice(i));
    }
  }

  return undefined;
}
```

**Benefits**:

- More flexible than fixed structure
- Can provide schemas at any depth
- Easier for destination authors

---

## Validation Integration

### Global Validation

The validation system we just built works perfectly with generic editor:

```typescript
// In ConfigEditorTabs
const validationErrors = useMemo(
  () => validateConfig(config, schemas),
  [config, schemas],
);

<MappingNavigationHeader
  validationErrors={validationErrors.length}
  onValidationClick={() => navigation.openTab([], 'validationOverview')}
/>
```

**Key Point**: `validateConfig()` already works with any config shape - it just
needs schemas!

### Path-Specific Validation

Panes already validate their specific fields:

```typescript
// MappingBatchPaneView
const value = mappingState.actions.getValue(path);
const schema = getSchemaForPath(path, schemas);
const validationResult = validateValue(value, schema);
```

This works at ANY depth because:

- `mappingState.actions.getValue(path)` - generic path traversal
- `getSchemaForPath(path, schemas)` - generic schema lookup
- `validateValue(value, schema)` - generic validation

---

## Performance Considerations

### Tree Rebuilding

**Current**: Tree rebuilds on every config change **Optimization**: Memoize tree
builder with deep equality

```typescript
const configTree = useMemo(
  () => buildTree(config, structure, schemas, sections),
  [
    JSON.stringify(config), // Deep comparison
    structure,
    schemas,
    sections,
  ],
);
```

**Alternative**: Incremental tree updates

```typescript
// Track which paths changed
const prevConfigRef = useRef(config);
const changedPaths = useMemo(() => {
  return detectChangedPaths(prevConfigRef.current, config);
}, [config]);

// Only rebuild affected branches
const configTree = useMemo(() => {
  if (changedPaths.length === 0) return prevTree;
  return updateTreeBranches(prevTree, changedPaths, config);
}, [changedPaths, config]);
```

### Type Detection Caching

```typescript
const nodeTypeCache = useRef<Map<string, NodeType>>(new Map());

function getNodeTypeFromPath(path, mappingState, structure, schemas) {
  const cacheKey = path.join('.');
  if (nodeTypeCache.current.has(cacheKey)) {
    return nodeTypeCache.current.get(cacheKey)!;
  }

  const nodeType = detectNodeType(...);
  nodeTypeCache.current.set(cacheKey, nodeType);
  return nodeType;
}
```

**Invalidation**: Clear cache on config/schema changes

---

## Testing Strategy

### Unit Tests

```typescript
describe('ConfigEditor', () => {
  it('should edit full DestinationConfig', () => {
    const { result } = renderHook(() => {
      const [config, setConfig] = useState(mockDestinationConfig);
      return { config, setConfig };
    });

    render(
      <ConfigEditor
        config={result.current.config}
        onChange={result.current.setConfig}
        structure={DESTINATION_CONFIG_STRUCTURE}
        schemas={mockSchemas}
      />
    );

    // Navigate to settings.pixelId
    fireEvent.click(screen.getByText('Settings'));
    fireEvent.click(screen.getByText('Pixel ID'));

    // Edit value
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: '123456' } });

    // Verify update
    expect(result.current.config.settings.pixelId).toBe('123456');
  });

  it('should edit nested rule', () => {
    const rule = mockDestinationConfig.mapping.page.view;
    const setRule = jest.fn();

    render(
      <ConfigEditor
        config={rule}
        onChange={setRule}
        structure={MAPPING_RULE_STRUCTURE}
      />
    );

    // Edit rule.batch
    fireEvent.click(screen.getByText('Batch'));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '2000' } });

    expect(setRule).toHaveBeenCalledWith(
      expect.objectContaining({ batch: 2000 })
    );
  });
});
```

### Integration Tests

```typescript
describe('ConfigEditor Integration', () => {
  it('should persist navigation across Code/Visual switches', () => {
    const { result } = renderHook(() => {
      const [config, setConfig] = useState(mockConfig);
      const [navState, setNavState] = useState(null);
      return { config, setConfig, navState, setNavState };
    });

    const { rerender } = render(
      <ConfigEditor
        config={result.current.config}
        onChange={result.current.setConfig}
        structure={DESTINATION_CONFIG_STRUCTURE}
        initialNavigationState={result.current.navState}
        onNavigationStateChange={result.current.setNavState}
        initialTab="visual"
      />
    );

    // Navigate to settings.pixelId
    fireEvent.click(screen.getByText('Settings'));
    fireEvent.click(screen.getByText('Pixel ID'));

    // Switch to code view
    rerender(/* same props but initialTab="code" */);

    // Switch back to visual
    rerender(/* back to initialTab="visual" */);

    // Should still be at settings.pixelId
    expect(screen.getByText('Pixel ID')).toBeInTheDocument();
  });
});
```

### Visual Regression Tests

```typescript
// Using Storybook + Chromatic
export const FullDestinationConfig = () => (
  <ConfigEditor
    config={mockDestinationConfig}
    structure={DESTINATION_CONFIG_STRUCTURE}
    schemas={metaPixelSchemas}
  />
);

export const SingleRule = () => (
  <ConfigEditor
    config={mockRule}
    structure={MAPPING_RULE_STRUCTURE}
  />
);

export const NestedMap = () => (
  <ConfigEditor
    config={mockMapObject}
    structure={VALUE_CONFIG_MAP_STRUCTURE}
  />
);
```

---

## Migration Path

### Phase 1: Alpha (Internal Use)

- Implement core ConfigEditor
- Migrate DestinationBox internally
- Test in explorer app
- Gather feedback

### Phase 2: Beta (Opt-in)

- Export ConfigEditor from @walkeros/explorer
- Update documentation
- Provide migration examples
- Maintain DestinationBox/MappingBox as wrappers

### Phase 3: Stable

- Deprecate old Box implementations
- All new code uses ConfigEditor
- Comprehensive examples in docs

### Phase 4: Cleanup

- Remove deprecated wrappers (breaking change)
- Simplify exports

---

## API Design Principles

### 1. Progressive Disclosure

**Simple Use** (Just show config):

```typescript
<ConfigEditor
  config={myConfig}
  structure={MY_STRUCTURE}
/>
```

**Editable**:

```typescript
<ConfigEditor
  config={myConfig}
  onChange={setMyConfig}
  structure={MY_STRUCTURE}
/>
```

**With Validation**:

```typescript
<ConfigEditor
  config={myConfig}
  onChange={setMyConfig}
  structure={MY_STRUCTURE}
  schemas={mySchemas}
/>
```

**Full Featured**:

```typescript
<ConfigEditor
  config={myConfig}
  onChange={setMyConfig}
  structure={MY_STRUCTURE}
  schemas={mySchemas}
  uiSchemas={myUiSchemas}
  sections={{ verbose: false }}
  initialTab="visual"
  showTree={true}
  initialNavigationState={savedState}
  onNavigationStateChange={saveState}
/>
```

### 2. Type Safety

```typescript
// Fully typed
interface MyConfig {
  database: { host: string; port: number };
  features: { analytics: boolean };
}

const myConfig: MyConfig = { ... };

<ConfigEditor<MyConfig>
  config={myConfig}
  onChange={(newConfig: MyConfig) => setMyConfig(newConfig)}
  structure={MY_STRUCTURE}
/>
```

### 3. Composition

```typescript
// Can wrap for specific use cases
export function DestinationEditor({ destination, ... }) {
  return (
    <ConfigEditor
      config={destination.config}
      onChange={(config) => updateDestination({ ...destination, config })}
      structure={DESTINATION_CONFIG_STRUCTURE}
      schemas={getDestinationSchemas(destination.type)}
    />
  );
}
```

---

## Future Enhancements

### 1. Real-time Collaboration

```typescript
<ConfigEditor
  config={config}
  onChange={onChange}
  structure={structure}
  collaboration={{
    room: 'destination-123',
    user: { id: 'user-1', name: 'Alice' },
  }}
/>
```

### 2. History/Undo

```typescript
<ConfigEditor
  config={config}
  onChange={onChange}
  structure={structure}
  history={{
    enabled: true,
    maxStates: 50,
  }}
/>
```

### 3. Diff View

```typescript
<ConfigEditor
  config={config}
  compareWith={previousConfig}
  structure={structure}
  mode="diff"
/>
```

### 4. Import/Export Presets

```typescript
<ConfigEditor
  config={config}
  onChange={onChange}
  structure={structure}
  presets={[
    { name: 'GA4 Standard', config: ga4StandardConfig },
    { name: 'Meta Pixel Basic', config: metaBasicConfig },
  ]}
/>
```

### 5. AI-Assisted Configuration

```typescript
<ConfigEditor
  config={config}
  onChange={onChange}
  structure={structure}
  ai={{
    enabled: true,
    suggestions: true,
    validation: true,
  }}
/>
```

---

## Conclusion

### Summary

**Is it possible?** Absolutely YES.

**Is it complex?** Moderate - the hard parts are already done.

**What's the ROI?**

- **Code Reduction**: ~70% less code (eliminate Box/EditorTabs duplication)
- **Consistency**: All editors behave identically
- **Flexibility**: Edit at ANY level with same component
- **Extensibility**: Easy to add new config types
- **Maintainability**: Single source of truth for editor logic

### The Core Insight

walkerOS already has a **universal data structure pattern**:

- Everything is JSON
- Everything uses path-based access
- Everything has optional schemas
- Everything can be validated

The **visual editor is already generic** - we just need to:

1. Extract the pattern
2. Make structure configurable
3. Remove hardcoded assumptions

### Recommended Next Steps

1. **Proof of Concept** (2 days)
   - Implement core ConfigEditor
   - Test with DestinationConfig
   - Test with single Rule

2. **Validate** (1 day)
   - Get feedback from team
   - Test edge cases
   - Refine API

3. **Full Implementation** (1 week)
   - Complete all phases
   - Write tests
   - Update documentation

4. **Migration** (2 days)
   - Convert DestinationBox
   - Convert MappingBox
   - Verify no regressions

**Total Time**: ~2 weeks for production-ready implementation

### Why This Matters

This isn't just about code reuse - it's about **unlocking new possibilities**:

- ✅ Edit individual rules in modals
- ✅ Embed config editors in other apps
- ✅ Create config wizards
- ✅ Build config comparison tools
- ✅ Generate config from templates
- ✅ Support custom config types beyond walkerOS

The **visual editor becomes a platform**, not just a component.
