import React from 'react';

export interface HeaderToggleProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  tabs?: string[];
  className?: string;
  showHTML?: boolean;
  showCSS?: boolean;
  showJS?: boolean;
}

// Style 1: Segmented Control Header
export function SegmentedControlHeader({
  activeTab,
  onTabChange,
  tabs,
  className = '',
  showHTML = true,
  showCSS = true,
  showJS = true,
}: HeaderToggleProps) {
  // Build tabs array based on boolean parameters
  const availableTabs = React.useMemo(() => {
    if (tabs) return tabs; // Use custom tabs if provided

    const tabList = [];
    if (showHTML) tabList.push('HTML');
    if (showCSS) tabList.push('CSS');
    if (showJS) tabList.push('JS');
    return tabList;
  }, [tabs, showHTML, showCSS, showJS]);

  return (
    <div className={`segmented-control-header ${className}`}>
      <div className="segmented-control segmented-control-compact">
        {availableTabs.map((tab) => (
          <button
            key={tab}
            className={`segmented-control-button ${activeTab === tab ? 'active' : ''}`}
            onClick={() => onTabChange(tab)}
            type="button"
          >
            {tab}
          </button>
        ))}
      </div>
    </div>
  );
}

// Style 2: Tab Pills Header
export function TabPillsHeader({
  activeTab,
  onTabChange,
  tabs = ['HTML', 'CSS', 'JS'],
  className = '',
}: HeaderToggleProps) {
  const tabConfig = [
    { id: 'HTML', label: 'HTML', icon: '📄' },
    { id: 'CSS', label: 'CSS', icon: '🎨' },
    { id: 'JS', label: 'JS', icon: '⚡' },
  ];

  return (
    <div className={`tab-pills-header ${className}`}>
      <div className="tab-pills">
        {tabConfig.map((tab) => (
          <button
            key={tab.id}
            className={`tab-pill ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => onTabChange(tab.id)}
            type="button"
          >
            <span className="tab-icon">{tab.icon}</span>
            <span className="tab-label">{tab.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// Style 3: Minimal Toggle Header
export function MinimalToggleHeader({
  activeTab,
  onTabChange,
  tabs = ['HTML', 'CSS', 'JS'],
  className = '',
}: HeaderToggleProps) {
  return (
    <div className={`minimal-toggle-header ${className}`}>
      <div className="minimal-toggle">
        {tabs.map((tab) => (
          <button
            key={tab}
            className={`minimal-toggle-button ${activeTab === tab ? 'active' : ''}`}
            onClick={() => onTabChange(tab)}
            type="button"
          >
            {tab}
          </button>
        ))}
      </div>
    </div>
  );
}

// Enhanced Box component that supports different header styles
export interface ToggleBoxProps {
  header: string;
  headerStyle?: 'default' | 'segmented' | 'pills' | 'minimal';
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  tabs?: string[];
  showHTML?: boolean;
  showCSS?: boolean;
  showJS?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function ToggleBox({
  header,
  headerStyle = 'default',
  activeTab = 'HTML',
  onTabChange,
  tabs,
  showHTML = true,
  showCSS = true,
  showJS = true,
  children,
  className = '',
}: ToggleBoxProps) {
  const renderHeaderActions = () => {
    if (!onTabChange) return null;

    switch (headerStyle) {
      case 'segmented':
        return (
          <SegmentedControlHeader
            activeTab={activeTab}
            onTabChange={onTabChange}
            tabs={tabs}
            showHTML={showHTML}
            showCSS={showCSS}
            showJS={showJS}
          />
        );
      case 'pills':
        return (
          <TabPillsHeader
            activeTab={activeTab}
            onTabChange={onTabChange}
            tabs={tabs}
          />
        );
      case 'minimal':
        return (
          <MinimalToggleHeader
            activeTab={activeTab}
            onTabChange={onTabChange}
            tabs={tabs}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className={`elb-explorer-mapping-box toggle-box ${className}`}>
      <div className="elb-explorer-mapping-header">
        <span className="elb-explorer-mapping-label">{header}</span>
        {renderHeaderActions()}
      </div>
      <div className="elb-explorer-mapping-editor">{children}</div>
    </div>
  );
}
