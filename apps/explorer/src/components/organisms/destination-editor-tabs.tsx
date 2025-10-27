import { useEffect, useState, useMemo } from 'react';
import {
  useMappingState,
  type UseMappingStateReturn,
} from '../../hooks/useMappingState';
import {
  useMappingNavigation,
  type NodeType,
} from '../../hooks/useMappingNavigation';
import { useTreeState } from '../../hooks/useTreeState';
import { MappingNavigationHeader } from '../molecules/mapping-navigation-header';
import { ConfigTreeSidebar } from '../molecules/config-tree-sidebar';
import { MappingPane } from '../molecules/mapping-pane';
import { MappingOverviewPane } from '../molecules/mapping-overview-pane';
import { CodeBox } from '../organisms/code-box';
import type { Destination, Mapping } from '@walkeros/core';
import { getValueAtPath } from '../../utils/mapping-path';
import type {
  DestinationConfig,
  DestinationSchemas,
  DestinationBoxSections,
} from './destination-box';
import { buildConfigTree } from '../../utils/config-tree-builder';
import { detectNodeType as detectNodeTypeFromValueAndSchema } from '../../utils/type-detector';
import {
  getRootPropertyNodeType,
  isMappingPath,
} from '../../schemas/destination-config-structure';

/**
 * Determines the appropriate NodeType based on path, value, and schemas
 *
 * SCHEMA-DRIVEN Detection Strategy for full DestinationConfig:
 * 1. Check if root property has a defined NodeType (settings, mapping, policy, consent)
 * 2. Handle mapping paths (mapping.entity.action hierarchy)
 * 3. Use UNIVERSAL TYPE DETECTION for everything else
 *
 * This is FULLY SCHEMA-DRIVEN - no hardcoded path checks except for
 * the entity→action hierarchy which is a special structural pattern.
 */
function getNodeTypeFromPath(
  path: string[],
  mappingState: UseMappingStateReturn,
  schemas?: DestinationSchemas,
): NodeType {
  // Empty path → overview
  if (path.length === 0) {
    return 'entity'; // Shows overview
  }

  // Root-level properties - check schema-defined NodeTypes
  if (path.length === 1) {
    const rootProperty = path[0];
    const definedType = getRootPropertyNodeType(rootProperty);

    if (definedType) {
      return definedType as NodeType;
    }

    // Otherwise use universal type detection
    const value = mappingState.actions.getValue(path);
    return detectNodeTypeFromValueAndSchema(value, path, schemas);
  }

  // Mapping paths - handle mapping.entity.action hierarchy
  if (isMappingPath(path)) {
    // ['mapping'] → entity list
    if (path.length === 1) {
      return 'entity';
    }
    // ['mapping', 'product'] → entity
    if (path.length === 2) {
      return 'entity';
    }
    // ['mapping', 'product', 'view'] → rule
    if (path.length === 3) {
      return 'rule';
    }
    // ['mapping', 'product', 'view', 'name'] → check for special rule properties
    if (path.length === 4) {
      const propertyName = path[3];
      if (propertyName === 'name') return 'name';
      if (propertyName === 'batch') return 'batch';
      if (propertyName === 'consent') return 'consent';
    }

    // Deeper paths → universal type detection
    const value = mappingState.actions.getValue(path);
    return detectNodeTypeFromValueAndSchema(value, path, schemas);
  }

  // All other paths (settings.*, policy.*, data.*, etc.) → universal type detection
  const value = mappingState.actions.getValue(path);
  return detectNodeTypeFromValueAndSchema(value, path, schemas);
}

/**
 * Destination Editor Tabs - Complete Destination Config Editor
 *
 * Like MappingEditorTabs but for full destination configurations including:
 * - Settings (destination-specific config)
 * - Mapping (event rules - entity → action)
 * - Data (global transformations)
 * - Policy (processing rules)
 * - Consent (consent requirements)
 * - Options (id, loadScript, queue, verbose)
 *
 * Uses ConfigTreeSidebar instead of MappingTreeSidebar to show
 * the full config structure.
 *
 * Features:
 * - Tab-based navigation (VS Code style)
 * - Breadcrumb wayfinding
 * - Config tree sidebar (collapsible)
 * - Context-aware editing panes
 * - Responsive layouts
 *
 * @example
 * <DestinationEditorTabs
 *   initialConfig={destinationConfig}
 *   onChange={(newConfig) => console.log(newConfig)}
 *   schemas={metaPixelSchemas}
 * />
 */
export interface DestinationEditorTabsProps<
  T extends Destination.TypesGeneric = Destination.Types,
> {
  initialConfig: DestinationConfig<T>;
  onChange?: (config: DestinationConfig<T>) => void;
  layout?: 'compact' | 'medium' | 'wide' | 'responsive';
  className?: string;
  showTree?: boolean;
  initialNavigationState?: {
    currentPath: string[];
    nodeType: NodeType;
    expandedPaths: string[][];
  };
  onNavigationStateChange?: (state: {
    currentPath: string[];
    nodeType: NodeType;
    expandedPaths: string[][];
  }) => void;
  schemas?: DestinationSchemas;
  sections?: DestinationBoxSections;
}

export function DestinationEditorTabs<
  T extends Destination.TypesGeneric = Destination.Types,
>({
  initialConfig,
  onChange,
  layout = 'responsive',
  className = '',
  showTree = true,
  initialNavigationState,
  onNavigationStateChange,
  schemas,
  sections = {},
}: DestinationEditorTabsProps<T>) {
  // Phase 1: State management hooks
  const mappingState = useMappingState(initialConfig as any, onChange as any);
  const navigation = useMappingNavigation();
  const treeState = useTreeState(initialNavigationState?.expandedPaths || [[]]);
  const [codeViewActive, setCodeViewActive] = useState(false);

  // Touch gesture support for swipe-to-dismiss tree sidebar on mobile
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  // Minimum swipe distance (in px) to be considered a swipe
  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;

    if (isLeftSwipe && navigation.treeVisible) {
      navigation.setTreeVisible(false);
    }
  };

  // Build config tree structure
  const configTree = useMemo(
    () =>
      buildConfigTree(
        mappingState.config as DestinationConfig,
        schemas,
        sections,
      ),
    [mappingState.config, schemas, sections],
  );

  // Get active tab for rendering
  const activeTab = navigation.openTabs.find(
    (tab) => tab.id === navigation.activeTabId,
  );

  // Get the code to display based on current path
  const currentCode = useMemo(() => {
    if (!activeTab || activeTab.path.length === 0) {
      return JSON.stringify(mappingState.config, null, 2);
    }

    const value = getValueAtPath(mappingState.config, activeTab.path);
    return JSON.stringify(value, null, 2);
  }, [activeTab, mappingState.config]);

  const handleCodeChange = (code: string) => {
    if (!onChange) return;

    try {
      const parsed = JSON.parse(code);

      if (!activeTab || activeTab.path.length === 0) {
        onChange(parsed as DestinationConfig);
      } else {
        const newConfig = { ...mappingState.config };
        let current: any = newConfig;

        // Navigate to parent
        for (let i = 0; i < activeTab.path.length - 1; i++) {
          current = current[activeTab.path[i]];
        }

        // Update value
        current[activeTab.path[activeTab.path.length - 1]] = parsed;
        onChange(newConfig as DestinationConfig);
      }
    } catch (e) {
      // Invalid JSON, don't update
    }
  };

  // Initialize navigation history with Overview
  useEffect(() => {
    if (navigation.navigationHistory.length === 0) {
      navigation.switchToTab('');

      if (
        initialNavigationState &&
        initialNavigationState.currentPath.length > 0
      ) {
        navigation.openTab(
          initialNavigationState.currentPath,
          initialNavigationState.nodeType,
        );
      }
    }
  }, []);

  // Persist navigation state changes
  useEffect(() => {
    if (onNavigationStateChange && activeTab) {
      onNavigationStateChange({
        currentPath: activeTab.path,
        nodeType: activeTab.nodeType,
        expandedPaths: Array.from(treeState.expandedPaths).map((key) =>
          key.split('.'),
        ),
      });
    }
  }, [activeTab, treeState.expandedPaths, onNavigationStateChange]);

  // Auto-expand tree to show active tab path
  useEffect(() => {
    if (activeTab && activeTab.path.length > 0) {
      for (let i = 1; i <= activeTab.path.length; i++) {
        const pathToExpand = activeTab.path.slice(0, i);
        treeState.expandPath(pathToExpand);
      }
    }
  }, [activeTab?.id]);

  return (
    <div
      className={`elb-mapping-editor-tabs elb-mapping-editor-tabs--${layout} ${className}`}
      data-layout={layout}
    >
      {/* Config Tree Sidebar */}
      {showTree && layout !== 'compact' && navigation.treeVisible && (
        <>
          <div
            className="elb-mapping-editor-mobile-backdrop"
            onClick={() => navigation.setTreeVisible(false)}
            aria-hidden="true"
          />
          <ConfigTreeSidebar
            tree={configTree}
            currentPath={activeTab?.path || []}
            expandedPaths={treeState.expandedPaths}
            visible={navigation.treeVisible}
            onToggle={treeState.togglePath}
            onNavigate={(path) => {
              const nodeType = getNodeTypeFromPath(path, mappingState, schemas);
              navigation.openTab(path, nodeType);
            }}
            onAddAction={(entity, action) => {
              // Path is ['mapping', entity] so create rule at ['mapping', entity, action]
              mappingState.actions.setValue(['mapping', entity, action], {});
              navigation.openTab(['mapping', entity, action], 'rule');
            }}
            onClose={() => navigation.setTreeVisible(false)}
            className="elb-mapping-editor-sidebar"
          />
        </>
      )}

      {/* Main Editor Area */}
      <div className="elb-mapping-editor-main">
        {/* Navigation Header */}
        <MappingNavigationHeader
          breadcrumb={navigation.breadcrumb}
          paneType={undefined}
          showTreeButton={showTree}
          showCodeButton={!!activeTab}
          codeViewActive={codeViewActive}
          showDeleteButton={activeTab && activeTab.path.length > 0}
          onNavigate={(path) => {
            if (path.length === 0) {
              navigation.closeAllTabs();
            } else {
              navigation.navigateToBreadcrumb(path);
            }
          }}
          onToggleTree={navigation.toggleTree}
          onToggleCode={() => setCodeViewActive(!codeViewActive)}
          onDeleteClick={() => {
            if (activeTab) {
              const path = activeTab.path;
              mappingState.actions.deleteValue(path);

              if (path.length > 1) {
                // Navigate to parent
                const parentPath = path.slice(0, -1);
                const parentType = getNodeTypeFromPath(
                  parentPath,
                  mappingState,
                  schemas,
                );
                navigation.openTab(parentPath, parentType);
              } else {
                // Close tab
                navigation.closeTab(activeTab.id);
              }
            }
          }}
        />

        {/* Editor Pane */}
        <div className="elb-mapping-editor-content">
          {codeViewActive ? (
            <CodeBox
              code={currentCode}
              language="json"
              label=""
              onChange={onChange ? handleCodeChange : undefined}
              showFormat={!!onChange}
              showHeader={false}
            />
          ) : activeTab ? (
            <MappingPane
              nodeType={activeTab.nodeType}
              path={activeTab.path}
              mappingState={mappingState}
              navigation={navigation}
              schemas={schemas}
            />
          ) : (
            <MappingOverviewPane
              mappingState={mappingState}
              navigation={navigation}
            />
          )}
        </div>
      </div>

      {/* Tree Sidebar Overlay (compact mode only) */}
      {showTree && layout === 'compact' && navigation.treeVisible && (
        <div
          className="elb-mapping-editor-overlay"
          onClick={() => navigation.setTreeVisible(false)}
        >
          <div
            className="elb-mapping-editor-overlay-content"
            onClick={(e) => e.stopPropagation()}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            <ConfigTreeSidebar
              tree={configTree}
              currentPath={activeTab?.path || []}
              expandedPaths={treeState.expandedPaths}
              visible={true}
              onToggle={treeState.togglePath}
              onNavigate={(path) => {
                const nodeType = getNodeTypeFromPath(
                  path,
                  mappingState,
                  schemas,
                );
                navigation.openTab(path, nodeType);
                navigation.setTreeVisible(false);
              }}
              onAddAction={(entity, action) => {
                mappingState.actions.setValue(['mapping', entity, action], {});
                navigation.openTab(['mapping', entity, action], 'rule');
                navigation.setTreeVisible(false);
              }}
              onClose={() => navigation.setTreeVisible(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
