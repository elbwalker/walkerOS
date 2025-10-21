import { useEffect, useState, useMemo } from 'react';
import { useMappingState } from '../../hooks/useMappingState';
import {
  useMappingNavigation,
  type NodeType,
} from '../../hooks/useMappingNavigation';
import { useTreeState } from '../../hooks/useTreeState';
import { MappingNavigationHeader } from '../molecules/mapping-navigation-header';
import { MappingTabBar } from '../molecules/mapping-tab-bar';
import { MappingTreeSidebar } from '../molecules/mapping-tree-sidebar';
import { MappingPane } from '../molecules/mapping-pane';
import { MappingOverviewPane } from '../molecules/mapping-overview-pane';
import { CodeBox } from '../organisms/code-box';
import type { Mapping } from '@walkeros/core';
import { getValueAtPath } from '../../utils/mapping-path';

/**
 * Mapping Editor Tabs - Main Editor Organism
 *
 * This is the complete tab-based mapping editor that combines all pieces:
 * - Phase 1: useMappingState, useMappingNavigation, useTreeState hooks
 * - Phase 2: Navigation UI components (breadcrumb, tabs, tree)
 * - Phase 3: Editor pane components (rule, value, map, loop)
 *
 * Features:
 * - Tab-based navigation (VS Code style)
 * - Breadcrumb wayfinding
 * - Tree sidebar (collapsible)
 * - Context-aware editing panes
 * - Responsive layouts (compact/medium/wide)
 *
 * @example
 * <MappingEditorTabs
 *   initialMapping={mappingConfig}
 *   onChange={(newConfig) => console.log(newConfig)}
 *   layout="responsive"
 * />
 */
export interface MappingEditorTabsProps {
  initialMapping: Mapping.Config;
  onChange?: (config: Mapping.Config) => void;
  layout?: 'compact' | 'medium' | 'wide' | 'responsive';
  className?: string;
  showTree?: boolean; // Show tree sidebar (default: true)
  // Navigation state persistence
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
}

export function MappingEditorTabs({
  initialMapping,
  onChange,
  layout = 'responsive',
  className = '',
  showTree = true,
  initialNavigationState,
  onNavigationStateChange,
}: MappingEditorTabsProps) {
  // Phase 1: State management hooks
  const mappingState = useMappingState(initialMapping, onChange);
  const navigation = useMappingNavigation();
  const treeState = useTreeState(initialNavigationState?.expandedPaths || [[]]);
  const [codeViewActive, setCodeViewActive] = useState(false);

  // Get active tab for rendering
  const activeTab = navigation.openTabs.find(
    (tab) => tab.id === navigation.activeTabId,
  );

  // Get the code to display based on current path
  const currentCode = useMemo(() => {
    if (!activeTab || activeTab.path.length === 0) {
      // Show entire mapping for overview
      return JSON.stringify(mappingState.config, null, 2);
    }

    // Show the specific part of the mapping for the current path
    const value = getValueAtPath(mappingState.config, activeTab.path);
    return JSON.stringify(value, null, 2);
  }, [activeTab, mappingState.config]);

  const handleCodeChange = (code: string) => {
    if (!onChange) return;

    try {
      const parsed = JSON.parse(code);

      if (!activeTab || activeTab.path.length === 0) {
        // Update entire mapping
        onChange(parsed as Mapping.Config);
      } else {
        // Update specific part
        const newConfig = { ...mappingState.config };
        let current: any = newConfig;

        // Navigate to parent
        for (let i = 0; i < activeTab.path.length - 1; i++) {
          current = current[activeTab.path[i]];
        }

        // Update value
        current[activeTab.path[activeTab.path.length - 1]] = parsed;
        onChange(newConfig);
      }
    } catch (e) {
      // Invalid JSON, don't update
    }
  };

  // Restore initial navigation state on mount
  useEffect(() => {
    if (initialNavigationState && navigation.openTabs.length === 0) {
      navigation.openTab(
        initialNavigationState.currentPath,
        initialNavigationState.nodeType,
      );
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
      // Expand all ancestor paths
      // For path ['page', 'view', 'data'], expand ['page'] and ['page', 'view']
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
      {/* Tree Sidebar (optional, collapsible) */}
      {showTree && layout !== 'compact' && (
        <MappingTreeSidebar
          config={mappingState.config}
          currentPath={activeTab?.path || []}
          expandedPaths={treeState.expandedPaths}
          visible={navigation.treeVisible}
          onToggle={treeState.togglePath}
          onNavigate={(path) => {
            // Determine node type from path semantically
            let nodeType:
              | 'entity'
              | 'rule'
              | 'name'
              | 'batch'
              | 'ignore'
              | 'consent'
              | 'valueType'
              | 'map';

            if (path.length === 1) {
              // entity only = entity pane
              nodeType = 'entity';
            } else if (path.length === 2) {
              // entity + action = rule overview
              nodeType = 'rule';
            } else if (path.length === 3) {
              // Third level - recognize known rule properties
              const propertyName = path[2];

              if (propertyName === 'name') {
                // name is a simple string
                nodeType = 'name';
              } else if (propertyName === 'batch') {
                // batch is a number
                nodeType = 'batch';
              } else if (propertyName === 'ignore') {
                // ignore is a boolean
                nodeType = 'ignore';
              } else if (propertyName === 'consent') {
                // consent is a map of state names
                nodeType = 'consent';
              } else if (
                ['data', 'policy', 'settings'].includes(propertyName)
              ) {
                // Complex transformations
                nodeType = 'map';
              } else {
                // Unknown property - use valueType pane
                nodeType = 'valueType';
              }
            } else {
              // Nested properties (depth > 3) - use valueType pane
              nodeType = 'valueType';
            }

            navigation.openTab(path, nodeType);
          }}
          onAddAction={(entity, action) => {
            // Create new rule with empty config and navigate to it
            mappingState.actions.createRule(entity, action, {});
            navigation.openTab([entity, action], 'rule');
          }}
          onAddEntity={(entity) => {
            // Create new empty entity and expand it
            mappingState.actions.setValue([entity], {});
            treeState.expandPath([entity]);
          }}
          onClose={() => navigation.setTreeVisible(false)}
          className="elb-mapping-editor-sidebar"
        />
      )}

      {/* Main Editor Area */}
      <div className="elb-mapping-editor-main">
        {/* Navigation Header: Breadcrumb + Tree Toggle + Code/Visual + Delete */}
        <MappingNavigationHeader
          breadcrumb={navigation.breadcrumb}
          paneType={codeViewActive ? undefined : activeTab?.nodeType}
          showTreeButton={showTree}
          showCodeButton={true}
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
              if (path.length === 1) {
                // Delete entity
                const entity = path[0];
                mappingState.actions.deleteValue([entity]);
                navigation.closeTab(activeTab.id);
              } else if (path.length === 2) {
                // Delete action/rule
                const [entity, action] = path;
                mappingState.actions.deleteRule(entity, action);
                navigation.closeTab(activeTab.id);
              } else {
                // Delete property
                mappingState.actions.deleteValue(path);
                // Navigate to parent
                navigation.openTab(
                  path.slice(0, -1),
                  path.length === 3 ? 'rule' : 'valueType',
                );
              }
            }
          }}
        />

        {/* Editor Pane: Active Tab Content or Code View */}
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
          >
            <MappingTreeSidebar
              config={mappingState.config}
              currentPath={activeTab?.path || []}
              expandedPaths={treeState.expandedPaths}
              visible={true}
              onToggle={treeState.togglePath}
              onNavigate={(path) => {
                // Determine node type from path
                let nodeType: 'entity' | 'rule' | 'valueType' | 'valueConfig';
                if (path.length === 1) {
                  // entity only = entity pane
                  nodeType = 'entity';
                } else if (path.length === 2) {
                  // entity + action = rule overview
                  nodeType = 'rule';
                } else if (
                  path.length === 3 ||
                  (path.length > 3 && path[path.length - 1] !== 'map')
                ) {
                  // First property level or nested properties = use valueType pane
                  nodeType = 'valueType';
                } else {
                  // Deep nested or specific transformations
                  nodeType = 'valueConfig';
                }
                navigation.openTab(path, nodeType);
                navigation.setTreeVisible(false); // Auto-close in compact mode
              }}
              onAddAction={(entity, action) => {
                // Create new rule with empty config and navigate to it
                mappingState.actions.createRule(entity, action, {});
                navigation.openTab([entity, action], 'rule');
                navigation.setTreeVisible(false); // Auto-close in compact mode
              }}
              onAddEntity={(entity) => {
                // Create new empty entity and expand it
                mappingState.actions.setValue([entity], {});
                treeState.expandPath([entity]);
                navigation.setTreeVisible(false); // Auto-close in compact mode
              }}
              onClose={() => navigation.setTreeVisible(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
