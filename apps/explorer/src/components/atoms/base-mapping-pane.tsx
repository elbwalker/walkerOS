import React from 'react';
import { PaneHeader } from './pane-header';
import type { UseMappingNavigationReturn } from '../../hooks/useMappingNavigation';

export interface BaseMappingPaneProps {
  /**
   * Pane title - if not provided (along with description), header won't render
   */
  title?: string;

  /**
   * Pane description - if not provided (along with title), header won't render
   */
  description?: string;

  /**
   * Navigation hook for back button functionality
   * If not provided, back button will be disabled
   */
  navigation?: UseMappingNavigationReturn;

  /**
   * Hide the back button even if navigation is provided
   * Useful for nested panes (e.g., ValueTypePaneView inside Loop pane)
   */
  hideNavigation?: boolean;

  /**
   * Optional action button in header (e.g., Reset)
   */
  headerAction?: {
    label: string;
    onClick: () => void;
    title?: string;
  };

  /**
   * Pane content
   */
  children: React.ReactNode;

  /**
   * Additional CSS class names
   */
  className?: string;
}

/**
 * BaseMappingPane - Standard pane wrapper with optional sticky header
 *
 * Provides consistent structure for all mapping panes:
 * - Optional sticky header with back button
 * - Scrollable content area
 * - Proper flex layout for full-height panes
 *
 * Header visibility logic:
 * - Shows header if title OR description is provided
 * - Hides header if both title AND description are undefined
 * - Use hideNavigation={true} to show header without back button (nested panes)
 *
 * Features:
 * - Sticky header stays visible while scrolling
 * - Proper scrolling with min-height: 0 for flexbox
 * - Extra bottom padding (50vh) for comfortable scrolling
 * - DRY principle - single source of truth for pane structure
 *
 * @example
 * // Standard pane with header
 * <BaseMappingPane
 *   title="Event Name"
 *   description="Override the event name"
 *   navigation={navigation}
 * >
 *   <div>Content here</div>
 * </BaseMappingPane>
 *
 * @example
 * // Nested pane without header
 * <BaseMappingPane>
 *   <div>Content with no header</div>
 * </BaseMappingPane>
 *
 * @example
 * // Pane with header but no navigation (e.g., section header)
 * <BaseMappingPane
 *   title="Item Mapping"
 *   description="Configure transformation"
 *   hideNavigation={true}
 * >
 *   <div>Nested content</div>
 * </BaseMappingPane>
 */
export function BaseMappingPane({
  title,
  description,
  navigation,
  hideNavigation = false,
  headerAction,
  children,
  className = '',
}: BaseMappingPaneProps) {
  // Show header if title OR description is provided
  const showHeader = !!(title || description);

  return (
    <div className={`elb-mapping-pane ${className}`}>
      {showHeader && (
        <div className="elb-mapping-pane-header--sticky">
          <PaneHeader
            title={title || ''}
            description={description || ''}
            onBack={navigation?.goBack}
            canGoBack={navigation?.canGoBack() ?? false}
            hideBackButton={hideNavigation}
            action={headerAction}
          />
        </div>
      )}
      <div className="elb-mapping-pane-content">{children}</div>
    </div>
  );
}
