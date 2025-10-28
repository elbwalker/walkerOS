import { useEffect, useState, useMemo } from 'react';
import {
  useMappingState,
  type UseMappingStateReturn,
} from '../../../hooks/useMappingState';
import {
  useMappingNavigation,
  type NodeType,
} from '../../../hooks/useMappingNavigation';
import { useTreeState } from '../../../hooks/useTreeState';
import { MappingNavigationHeader } from '../../molecules/mapping-navigation-header';
import { ConfigTreeSidebar } from '../../molecules/config-tree-sidebar';
import { MappingPane } from '../../molecules/mapping-pane';
import { ConfigOverviewPane } from '../../molecules/config-overview-pane';
import { ValidationOverviewPane } from '../../molecules/validation-overview-pane';
import { CodeBox } from '../code-box';
import { getValueAtPath } from '../../../utils/mapping-path';
import type { ConfigStructureDef } from '../../../schemas/config-structures/types';
import type { RJSFSchema } from '@rjsf/utils';
import { buildTree } from '../../../utils/generic-tree-builder';
import { detectNodeTypeWithStructure } from '../../../utils/type-detector';
import { validateConfig } from '../../../utils/config-validator';

/**
 * Generic Config Editor Tabs
 *
 * Core editor component that works with any config type at any depth.
 * Uses structure definitions and schemas to provide appropriate editing UI.
 *
 * Features:
 * - Generic tree navigation (config-driven)
 * - Structure-aware type detection
 * - Validation with error overview
 * - Code/Visual toggle support
 * - Works at any depth (full config or nested object)
 *
 * @example
 * // Full DestinationConfig
 * <ConfigEditorTabs
 *   config={destinationConfig}
 *   onChange={setConfig}
 *   structure={DESTINATION_CONFIG_STRUCTURE}
 *   schemas={{ settings: settingsSchema, mapping: mappingSchema }}
 * />
 *
 * @example
 * // Single Rule
 * <ConfigEditorTabs
 *   config={ruleConfig}
 *   onChange={setRuleConfig}
 *   structure={MAPPING_RULE_STRUCTURE}
 *   schemas={{ mapping: mappingSettingsSchema }}
 * />
 */
export interface ConfigEditorTabsProps<T extends Record<string, unknown>> {
  config: T;
  onChange?: (config: T) => void;
  structure: ConfigStructureDef;
  schemas?: Record<string, RJSFSchema>;
  sections?: Record<string, boolean>;
  showTree?: boolean;
  initialNavigationState?: NavigationState;
  onNavigationStateChange?: (state: NavigationState) => void;
  className?: string;
}

export interface NavigationState {
  currentPath: string[];
  nodeType: NodeType;
  expandedPaths: string[][];
}

export function ConfigEditorTabs<T extends Record<string, unknown>>({
  config,
  onChange,
  structure,
  schemas,
  sections = {},
  showTree = true,
  initialNavigationState,
  onNavigationStateChange,
  className = '',
}: ConfigEditorTabsProps<T>) {
  // State management hooks (already generic!)
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
    () => validateConfig(config as Record<string, unknown>, schemas),
    [config, schemas],
  );

  // Get active tab
  const activeTab = navigation.openTabs.find(
    (tab) => tab.id === navigation.activeTabId,
  );

  // Get code for current path
  const currentCode = useMemo(() => {
    if (!activeTab || activeTab.path.length === 0) {
      return JSON.stringify(config, null, 2);
    }

    const value = getValueAtPath(
      config as Record<string, unknown>,
      activeTab.path,
    );
    return JSON.stringify(value, null, 2);
  }, [activeTab, config]);

  // Handle code changes
  const handleCodeChange = (code: string) => {
    if (!onChange) return;

    try {
      const parsed = JSON.parse(code);

      if (!activeTab || activeTab.path.length === 0) {
        onChange(parsed as T);
      } else {
        const newConfig = { ...config };
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

  // Get NodeType for a path using structure
  const getNodeTypeForPath = (path: string[]): NodeType => {
    const value = mappingState.actions.getValue(path);
    return detectNodeTypeWithStructure(value, path, structure, schemas);
  };

  return (
    <div
      className={`elb-mapping-editor-tabs elb-mapping-editor-tabs--responsive ${className}`}
      data-layout="responsive"
    >
      {/* Tree Sidebar */}
      {showTree && (
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
              const nodeType = getNodeTypeForPath(path);
              navigation.openTab(path, nodeType);
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
          paneType={codeViewActive ? undefined : activeTab?.nodeType}
          showTreeButton={showTree}
          showCodeButton={!!activeTab}
          codeViewActive={codeViewActive}
          showDeleteButton={activeTab && activeTab.path.length > 0}
          validationErrors={validationErrors.length}
          onNavigate={(path) => {
            if (path.length === 0) {
              navigation.closeAllTabs();
            } else {
              navigation.navigateToBreadcrumb(path);
            }
          }}
          onToggleTree={navigation.toggleTree}
          onToggleCode={() => setCodeViewActive(!codeViewActive)}
          onValidationClick={() => {
            navigation.openTab([], 'validationOverview' as NodeType);
          }}
          onDeleteClick={() => {
            if (activeTab) {
              const path = activeTab.path;
              mappingState.actions.deleteValue(path);

              if (path.length > 1) {
                // Navigate to parent
                const parentPath = path.slice(0, -1);
                const parentType = getNodeTypeForPath(parentPath);
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
            activeTab.nodeType === 'validationOverview' ? (
              <ValidationOverviewPane
                errors={validationErrors}
                navigation={navigation}
              />
            ) : (
              <MappingPane
                nodeType={activeTab.nodeType}
                path={activeTab.path}
                mappingState={mappingState}
                navigation={navigation}
                schemas={schemas as any}
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
