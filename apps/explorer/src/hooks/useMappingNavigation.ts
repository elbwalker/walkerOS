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
  | 'policy'
  | 'consent'
  | 'settings' // Config-level settings overview
  | 'options' // Config-level options (loadScript, queue, etc.)
  | 'validationOverview' // Validation errors overview
  | 'valueConfig'
  | 'valueType'
  | 'primitive' // Schema-defined string/number primitives (no ValueConfig conversion)
  | 'map'
  | 'loop'
  | 'set'
  | 'value'
  | 'fn'
  | 'validate'
  | 'condition'
  | 'enum'
  | 'boolean';

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
const MAX_HISTORY_LENGTH = 50;

export function useMappingNavigation() {
  const [openTabs, setOpenTabs] = useState<NavigationTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string>('');
  const [treeVisible, setTreeVisible] = useState<boolean>(true);
  const [navigationHistory, setNavigationHistory] = useState<string[]>([]);

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

      // Add to navigation history (only if switching to different tab)
      setNavigationHistory((prev) => {
        // Don't add if it's the same as current active tab
        if (prev.length > 0 && prev[prev.length - 1] === tabId) {
          return prev;
        }

        // Add and limit to MAX_HISTORY_LENGTH
        const newHistory = [...prev, tabId];
        if (newHistory.length > MAX_HISTORY_LENGTH) {
          return newHistory.slice(-MAX_HISTORY_LENGTH);
        }
        return newHistory;
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
    // Add to navigation history when switching tabs
    setNavigationHistory((prev) => {
      // Don't add if it's the same as current active tab
      if (prev.length > 0 && prev[prev.length - 1] === tabId) {
        return prev;
      }

      // Add and limit to MAX_HISTORY_LENGTH
      const newHistory = [...prev, tabId];
      if (newHistory.length > MAX_HISTORY_LENGTH) {
        return newHistory.slice(-MAX_HISTORY_LENGTH);
      }
      return newHistory;
    });

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
   * Go back to previous tab in navigation history
   *
   * Validates that the previous tab still exists before navigating.
   * If deleted, keeps going back until a valid tab is found.
   * If no valid history, does nothing (button will be disabled).
   */
  const goBack = useCallback(() => {
    setNavigationHistory((prevHistory) => {
      if (prevHistory.length <= 1) {
        // No history to go back to
        return prevHistory;
      }

      // Remove current tab from history (last item)
      let workingHistory = prevHistory.slice(0, -1);
      let foundValidTab = false;

      // Keep popping until we find a valid tab or run out of history
      while (workingHistory.length > 0 && !foundValidTab) {
        const previousTabId = workingHistory[workingHistory.length - 1];

        // Special case: empty tab ID means Overview
        if (previousTabId === '') {
          setActiveTabId(''); // This will trigger Overview pane to show
          foundValidTab = true;
          return workingHistory;
        }

        const previousTab = openTabs.find((t) => t.id === previousTabId);

        if (previousTab) {
          // Found valid tab - switch to it
          setActiveTabId(previousTabId);
          foundValidTab = true;
          return workingHistory;
        } else {
          // Tab was deleted, remove from history and try again
          workingHistory = workingHistory.slice(0, -1);
        }
      }

      // No valid tabs found in history - clear history
      return [];
    });
  }, [openTabs]);

  /**
   * Check if back navigation is available
   */
  const canGoBack = useCallback((): boolean => {
    if (navigationHistory.length <= 1) return false;

    // Check if there's at least one valid tab in history (excluding current)
    const historyWithoutCurrent = navigationHistory.slice(0, -1);
    return historyWithoutCurrent.some(
      (tabId) =>
        // Empty tab ID (Overview) is always valid, or tab exists in openTabs
        tabId === '' || openTabs.some((tab) => tab.id === tabId),
    );
  }, [navigationHistory, openTabs]);

  /**
   * Toggle tree visibility
   */
  const toggleTree = useCallback(() => {
    setTreeVisible((prev) => !prev);
  }, []);

  /**
   * Navigate to a path using dot notation
   *
   * Enables deep linking by parsing a string path and opening all intermediate tabs.
   *
   * @param dotPath - Path in dot notation (e.g., "page.view.data.map.items.consent")
   *
   * @example
   * navigation.navigateToPath('page.view.consent');
   * // Opens: page entity → view rule → consent property
   *
   * @example
   * navigation.navigateToPath('product.add.data.map.items.key');
   * // Opens all intermediate tabs leading to the key property
   */
  const navigateToPath = useCallback(
    (dotPath: string) => {
      const pathArray = dotPath.split('.').filter((s) => s.trim());

      if (pathArray.length < 2) {
        console.warn('Invalid path for navigation:', dotPath);
        return;
      }

      // Open entity tab
      if (pathArray.length >= 1) {
        openTab([pathArray[0]], 'entity');
      }

      // Open rule tab
      if (pathArray.length >= 2) {
        openTab([pathArray[0], pathArray[1]], 'rule');
      }

      // Open deeper tabs
      for (let i = 3; i <= pathArray.length; i++) {
        const subPath = pathArray.slice(0, i);
        // Determine node type - for now use generic, could be enhanced with path analyzer
        const nodeType: NodeType =
          subPath[subPath.length - 1] === 'consent'
            ? 'consent'
            : subPath[subPath.length - 1] === 'condition'
              ? 'condition'
              : subPath[subPath.length - 1] === 'map'
                ? 'map'
                : 'valueConfig';

        openTab(subPath, nodeType);
      }
    },
    [openTab],
  );

  return {
    // State
    openTabs,
    activeTabId,
    treeVisible,
    breadcrumb: getBreadcrumb(),
    navigationHistory,

    // Actions
    openTab,
    switchToTab,
    closeTab,
    closeLevel,
    closeAllTabs,
    navigateToBreadcrumb,
    navigateToPath,
    toggleTree,
    setTreeVisible,
    goBack,

    // Queries
    findTab,
    hasTab,
    canGoBack,
  };
}

/**
 * Return type of useMappingNavigation hook
 *
 * Provides tab-based navigation state management with:
 * - State: openTabs, activeTabId, treeVisible, breadcrumb, navigationHistory
 * - Actions: openTab, closeTab, navigateToPath, goBack, etc.
 * - Queries: getActiveTab, canGoBack
 *
 * @example
 * const navigation: UseMappingNavigationReturn = useMappingNavigation();
 */
export type UseMappingNavigationReturn = ReturnType<
  typeof useMappingNavigation
>;

/**
 * @deprecated Use UseMappingNavigationReturn instead
 * This alias is kept for backward compatibility and will be removed in the next major version.
 */
export type MappingNavigation = UseMappingNavigationReturn;
