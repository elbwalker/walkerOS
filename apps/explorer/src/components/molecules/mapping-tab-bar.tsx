import { MappingTab } from '../atoms/mapping-tab';
import type { NavigationTab } from '../../hooks/useMappingNavigation';

/**
 * Scrollable tab container
 *
 * Displays all open tabs with horizontal scrolling when needed
 */
export interface MappingTabBarProps {
  tabs: NavigationTab[];
  activeTabId: string;
  onTabSelect: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
  className?: string;
}

export function MappingTabBar({
  tabs,
  activeTabId,
  onTabSelect,
  onTabClose,
  className = '',
}: MappingTabBarProps) {
  if (tabs.length === 0) {
    return null;
  }

  return (
    <div className={`elb-mapping-tab-bar ${className}`} role="tablist">
      <div className="elb-mapping-tab-bar-scroll">
        {tabs.map((tab) => (
          <MappingTab
            key={tab.id}
            tab={tab}
            isActive={tab.id === activeTabId}
            onSelect={onTabSelect}
            onClose={onTabClose}
          />
        ))}
      </div>
    </div>
  );
}
