import React, { useState } from 'react';
import { Header } from './header';
import { useGridHeight } from '../../contexts/GridHeightContext';

export interface BoxTab {
  id: string;
  label: string;
  content?: React.ReactNode;
}

export interface BoxProps {
  header?: string;
  headerActions?: React.ReactNode;
  footer?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  // Height management
  height?: number | string;
  minHeight?: number | string;
  maxHeight?: number | string;
  tiny?: boolean;
  resizable?: boolean;
  showHeader?: boolean; // Hide header (default: true)
  // Tabs support
  tabs?: BoxTab[];
  activeTab?: string; // Controlled mode
  onTabChange?: (id: string) => void;
  defaultTab?: string; // Uncontrolled default
  // Mac style
  showTrafficLights?: boolean;
}

/**
 * Box - Container atom component
 *
 * Provides a consistent box container with header and content area.
 * Used across all explorer components for consistent styling.
 *
 * Height behavior:
 * - Default: minHeight 100px, grows as needed
 * - tiny prop: sets minHeight to 100px explicitly
 * - Custom minHeight/maxHeight: override defaults
 * - In Grid: fills row height (equal heights per row)
 *
 * @example
 * <Box header="Preview">
 *   <Preview html={html} css={css} />
 * </Box>
 *
 * @example
 * <Box header="Code" minHeight={200} maxHeight={600}>
 *   <CodeBox ... />
 * </Box>
 */
function TrafficLights() {
  return (
    <div className="elb-explorer-traffic-lights">
      <span className="elb-explorer-traffic-light elb-explorer-traffic-light--red" />
      <span className="elb-explorer-traffic-light elb-explorer-traffic-light--yellow" />
      <span className="elb-explorer-traffic-light elb-explorer-traffic-light--green" />
    </div>
  );
}

export function Box({
  header,
  headerActions,
  footer,
  children,
  className = '',
  style,
  height,
  minHeight,
  maxHeight,
  tiny = false,
  resizable = false,
  showHeader = true,
  tabs,
  activeTab: controlledActiveTab,
  onTabChange,
  defaultTab,
  showTrafficLights = false,
}: BoxProps) {
  // Grid context for synchronized heights
  const gridContext = useGridHeight();

  // Uncontrolled tab state
  const [internalActiveTab, setInternalActiveTab] = useState(
    defaultTab || (tabs?.[0]?.id ?? ''),
  );

  // Controlled vs uncontrolled
  const isControlled = controlledActiveTab !== undefined;
  const activeTabId = isControlled ? controlledActiveTab : internalActiveTab;

  const handleTabClick = (tabId: string) => {
    if (onTabChange) {
      onTabChange(tabId);
    }
    if (!isControlled) {
      setInternalActiveTab(tabId);
    }
  };

  // Height management: explicit > grid synced > default
  const boxStyle: React.CSSProperties = { ...style };

  if (height !== undefined) {
    boxStyle.height = typeof height === 'number' ? `${height}px` : height;
  } else if (gridContext?.syncedHeight) {
    boxStyle.height = `${gridContext.syncedHeight}px`;
  }

  if (tiny) {
    boxStyle.height = 'auto';
    boxStyle.minHeight =
      minHeight !== undefined
        ? typeof minHeight === 'number'
          ? `${minHeight}px`
          : minHeight
        : '100px';
  } else if (minHeight !== undefined) {
    boxStyle.minHeight =
      typeof minHeight === 'number' ? `${minHeight}px` : minHeight;
  }

  if (maxHeight !== undefined) {
    boxStyle.maxHeight =
      typeof maxHeight === 'number' ? `${maxHeight}px` : maxHeight;
  }

  if (resizable) {
    boxStyle.resize = 'vertical';
    boxStyle.overflow = 'auto';
  }

  // Auto-height class for grid context
  const useContentHeight = !!gridContext?.enabled;
  const autoHeightClass = useContentHeight ? 'elb-box--auto-height' : '';

  // Determine content: tab content (if available) or children
  const activeTabContent = tabs?.find((t) => t.id === activeTabId)?.content;
  const content = activeTabContent ?? children;

  // Render tabs header or regular header
  const hasTabs = tabs && tabs.length > 0;
  const showRegularHeader = showHeader && header && !hasTabs;

  return (
    <div
      className={`elb-explorer elb-explorer-box ${autoHeightClass} ${className}`.trim()}
      style={boxStyle}
    >
      {hasTabs && (
        <div className="elb-explorer-tabs">
          {showTrafficLights && <TrafficLights />}
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`elb-explorer-tab ${activeTabId === tab.id ? 'elb-explorer-tab--active' : ''}`}
              onClick={() => handleTabClick(tab.id)}
            >
              {tab.label}
            </button>
          ))}
          {headerActions && (
            <div className="elb-explorer-tab-actions">{headerActions}</div>
          )}
        </div>
      )}
      {showRegularHeader && <Header label={header}>{headerActions}</Header>}
      <div className="elb-explorer-content">{content}</div>
      {footer && <div className="elb-explorer-footer">{footer}</div>}
    </div>
  );
}
