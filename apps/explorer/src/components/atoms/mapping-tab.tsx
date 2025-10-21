import type { NavigationTab } from '../../hooks/useMappingNavigation';

/**
 * Single tab for tab-based navigation
 *
 * Displays tab label, active state, and close button
 */
export interface MappingTabProps {
  tab: NavigationTab;
  isActive: boolean;
  onSelect: (tabId: string) => void;
  onClose: (tabId: string) => void;
  className?: string;
}

export function MappingTab({
  tab,
  isActive,
  onSelect,
  onClose,
  className = '',
}: MappingTabProps) {
  return (
    <div
      className={`elb-mapping-tab ${isActive ? 'is-active' : ''} ${className}`}
      role="tab"
      aria-selected={isActive}
      aria-controls={`panel-${tab.id}`}
      id={`tab-${tab.id}`}
    >
      <button
        type="button"
        className="elb-mapping-tab-button"
        onClick={() => onSelect(tab.id)}
      >
        <span className="elb-mapping-tab-label">{tab.label}</span>
      </button>
      {tab.path.length > 0 && (
        <button
          type="button"
          className="elb-mapping-tab-close"
          onClick={(e) => {
            e.stopPropagation();
            onClose(tab.id);
          }}
          aria-label={`Close ${tab.label}`}
        >
          ×
        </button>
      )}
    </div>
  );
}
