import { useState, useCallback } from 'react';

/**
 * Tree expand/collapse state management
 *
 * Manages which paths in a tree view are expanded or collapsed.
 * This hook is UI-agnostic and can be used with any tree structure.
 *
 * @example
 * const treeState = useTreeState(['']); // Root expanded by default
 *
 * // Check if expanded
 * if (treeState.isExpanded(['product', 'view'])) { ... }
 *
 * // Toggle expansion
 * treeState.togglePath(['product', 'view']);
 *
 * // Expand specific path
 * treeState.expandPath(['product', 'view', 'data']);
 *
 * // Collapse specific path
 * treeState.collapsePath(['product']);
 */
export function useTreeState(initialExpanded: string[][] = [[]]) {
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(() => {
    return new Set(initialExpanded.map((path) => path.join('.')));
  });

  /**
   * Check if a path is expanded
   */
  const isExpanded = useCallback(
    (path: string[]): boolean => {
      const pathKey = path.join('.');
      return expandedPaths.has(pathKey);
    },
    [expandedPaths],
  );

  /**
   * Toggle path expansion
   */
  const togglePath = useCallback((path: string[]) => {
    const pathKey = path.join('.');
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(pathKey)) {
        next.delete(pathKey);
      } else {
        next.add(pathKey);
      }
      return next;
    });
  }, []);

  /**
   * Expand specific path
   */
  const expandPath = useCallback((path: string[]) => {
    const pathKey = path.join('.');
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      next.add(pathKey);
      return next;
    });
  }, []);

  /**
   * Collapse specific path
   */
  const collapsePath = useCallback((path: string[]) => {
    const pathKey = path.join('.');
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      next.delete(pathKey);
      return next;
    });
  }, []);

  /**
   * Expand all paths
   */
  const expandAll = useCallback((allPaths: string[][]) => {
    setExpandedPaths(new Set(allPaths.map((path) => path.join('.'))));
  }, []);

  /**
   * Collapse all paths
   */
  const collapseAll = useCallback(() => {
    setExpandedPaths(new Set());
  }, []);

  return {
    expandedPaths,
    isExpanded,
    togglePath,
    expandPath,
    collapsePath,
    expandAll,
    collapseAll,
  };
}

export type TreeState = ReturnType<typeof useTreeState>;
