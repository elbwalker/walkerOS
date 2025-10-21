import { useState, useCallback } from 'react';
import { buildBreadcrumbSegments, getParentPath } from '../utils/mapping-path';
import type { BreadcrumbSegment } from '../utils/mapping-path';

/**
 * Node types for different editing contexts
 */
export type NodeType =
  | 'entity'
  | 'rule'
  | 'name'
  | 'batch'
  | 'ignore'
  | 'valueConfig'
  | 'valueType'
  | 'map'
  | 'loop'
  | 'set'
  | 'key'
  | 'value'
  | 'fn'
  | 'validate'
  | 'condition'
  | 'consent';

/**
 * Navigation tab representing an open editing context
 */
export interface NavigationTab {
  id: string;
  path: string[];
  nodeType: NodeType;
  label: string;
}

/**
 * Navigation state for tab-based mapping editor
 *
 * Manages:
 * - Open tabs with their paths and types
 * - Active tab selection
 * - Breadcrumb generation
 * - Tree sidebar visibility
 * - Tab opening/closing logic
 *
 * This hook is UI-agnostic - it only manages navigation state,
 * not how tabs are rendered.
 *
 * @example
 * const navigation = useMappingNavigation();
 *
 * // Open a new tab
 * navigation.openTab(['product', 'view', 'data'], 'valueConfig');
 *
 * // Switch tabs
 * navigation.switchToTab(tabId);
 *
 * // Close current level
 * navigation.closeLevel(); // Closes current tab and goes to parent
 */
export function useMappingNavigation() {
  const [openTabs, setOpenTabs] = useState<NavigationTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string>('');
  const [treeVisible, setTreeVisible] = useState<boolean>(true);

  /**
   * Generate unique tab ID from path
   */
  const generateTabId = useCallback((path: string[]): string => {
    return path.join('.');
  }, []);

  /**
   * Generate human-readable label from path
   */
  const generateLabel = useCallback(
    (path: string[], nodeType: NodeType): string => {
      if (path.length === 0) return 'Overview';

      // For rules, use "entity action" format
      if (path.length === 2 && nodeType === 'rule') {
        return `${path[0]} ${path[1]}`;
      }

      // For nested properties, use last segment capitalized
      const lastSegment = path[path.length - 1];
      return lastSegment.charAt(0).toUpperCase() + lastSegment.slice(1);
    },
    [],
  );

  /**
   * Find tab by ID
   */
  const findTab = useCallback(
    (tabId: string): NavigationTab | undefined => {
      return openTabs.find((tab) => tab.id === tabId);
    },
    [openTabs],
  );

  /**
   * Check if tab exists
   */
  const hasTab = useCallback(
    (path: string[]): boolean => {
      const tabId = generateTabId(path);
      return openTabs.some((tab) => tab.id === tabId);
    },
    [openTabs, generateTabId],
  );

  /**
   * Open new tab or switch to existing one
   */
  const openTab = useCallback(
    (path: string[], nodeType: NodeType) => {
      const tabId = generateTabId(path);

      // Check if tab exists and add if needed
      setOpenTabs((prev) => {
        const existingTab = prev.find((t) => t.id === tabId);
        if (existingTab) {
          return prev; // No change needed
        }

        // Create and add new tab
        const newTab: NavigationTab = {
          id: tabId,
          path,
          nodeType,
          label: generateLabel(path, nodeType),
        };

        return [...prev, newTab];
      });

      // Always set as active (separate state update)
      setActiveTabId(tabId);
    },
    [generateTabId, generateLabel],
  );

  /**
   * Switch to existing tab
   */
  const switchToTab = useCallback((tabId: string) => {
    setActiveTabId(tabId);
  }, []);

  /**
   * Close specific tab
   */
  const closeTab = useCallback(
    (tabId: string) => {
      // Determine new active ID based on what's left after closing
      let newActiveId = '';

      setOpenTabs((prev) => {
        const newTabs = prev.filter((tab) => tab.id !== tabId);

        // Check if the tab being closed exists and is the last one (likely active)
        const closingTab = prev.find((tab) => tab.id === tabId);
        const isLastTab = closingTab && prev[prev.length - 1]?.id === tabId;

        // If closing what's likely the active tab, switch to last remaining
        if (isLastTab || tabId === activeTabId) {
          if (newTabs.length > 0) {
            newActiveId = newTabs[newTabs.length - 1].id;
          } else {
            newActiveId = '';
          }
        } else {
          // Not closing active tab, keep current active
          newActiveId = activeTabId;
        }

        return newTabs;
      });

      // Update active tab
      setActiveTabId(newActiveId);
    },
    [activeTabId],
  );

  /**
   * Close current tab and return to parent
   *
   * If parent tab already exists, switches to it.
   * Otherwise just closes current tab.
   */
  const closeLevel = useCallback(() => {
    if (!activeTabId) return;

    const currentActiveId = activeTabId;

    // Determine what to do with active tab ID
    let newActiveId = '';
    setOpenTabs((prevTabs) => {
      const activeTab = prevTabs.find((t) => t.id === currentActiveId);
      if (!activeTab) {
        newActiveId = currentActiveId; // Keep current
        return prevTabs;
      }

      const parentPath = getParentPath(activeTab.path);
      const parentId = generateTabId(parentPath);

      // Check if parent tab exists
      const parentTab = prevTabs.find((t) => t.id === parentId);

      // Filter out current tab
      const newTabs = prevTabs.filter((t) => t.id !== currentActiveId);

      // Determine new active ID
      if (parentTab && parentPath.length >= 2) {
        newActiveId = parentId;
      } else if (newTabs.length > 0) {
        newActiveId = newTabs[newTabs.length - 1].id;
      } else {
        newActiveId = '';
      }

      return newTabs;
    });

    // Update active tab (separate state update)
    setActiveTabId(newActiveId);
  }, [activeTabId, generateTabId]);

  /**
   * Close all tabs
   */
  const closeAllTabs = useCallback(() => {
    setOpenTabs([]);
    setActiveTabId('');
  }, []);

  /**
   * Get breadcrumb for active tab
   */
  const getBreadcrumb = useCallback((): BreadcrumbSegment[] => {
    const activeTab = findTab(activeTabId);
    if (!activeTab) {
      return [{ label: 'Overview', path: [], nodeType: 'root' }];
    }

    return buildBreadcrumbSegments(activeTab.path);
  }, [activeTabId, findTab]);

  /**
   * Navigate to breadcrumb segment
   */
  const navigateToBreadcrumb = useCallback(
    (segmentPath: string[]) => {
      if (segmentPath.length === 0) {
        // Navigate to root - close all tabs
        closeAllTabs();
        return;
      }

      // Determine node type based on path length
      let nodeType: NodeType = 'valueConfig';
      if (segmentPath.length === 2) {
        nodeType = 'rule';
      }

      openTab(segmentPath, nodeType);
    },
    [openTab, closeAllTabs],
  );

  /**
   * Toggle tree visibility
   */
  const toggleTree = useCallback(() => {
    setTreeVisible((prev) => !prev);
  }, []);

  return {
    // State
    openTabs,
    activeTabId,
    treeVisible,
    breadcrumb: getBreadcrumb(),

    // Actions
    openTab,
    switchToTab,
    closeTab,
    closeLevel,
    closeAllTabs,
    navigateToBreadcrumb,
    toggleTree,
    setTreeVisible,

    // Queries
    findTab,
    hasTab,
  };
}

export type MappingNavigation = ReturnType<typeof useMappingNavigation>;
