import React, { useState, useCallback } from 'react';
import { Box } from '../atoms/box';
import { CodeStatic } from '../atoms/code-static';

/**
 * Tab with code content for CodeView
 */
export interface CodeViewTab {
  id: string;
  label: string;
  code: string;
  language?: string; // Optional, defaults to CodeView's language prop
}

export interface CodeViewProps {
  // Single code mode
  code?: string;
  language?: string;

  // Tabs mode
  tabs?: CodeViewTab[];
  activeTab?: string;
  onTabChange?: (id: string) => void;
  defaultTab?: string;

  // Header
  label?: string;
  header?: string;
  showHeader?: boolean;
  showTrafficLights?: boolean;

  // Actions
  showCopy?: boolean;

  // Layout
  footer?: React.ReactNode;
  height?: string | number;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * CodeView - Read-only code rendered with the same visual chrome as CodeBox.
 *
 * Composes Box + CodeStatic. Use for non-interactive code blocks where Monaco
 * would be overkill but you want visual parity with `<CodeBox disabled>`.
 *
 * @example
 * <CodeView code={snippet} language="typescript" label="Setup" />
 *
 * @example
 * <CodeView
 *   tabs={[
 *     { id: 'js', label: 'JavaScript', code: jsCode, language: 'javascript' },
 *     { id: 'ts', label: 'TypeScript', code: tsCode, language: 'typescript' },
 *   ]}
 *   showTrafficLights
 * />
 */
export function CodeView({
  code,
  language = 'javascript',
  tabs,
  activeTab: controlledActiveTab,
  onTabChange,
  defaultTab,
  label,
  header,
  showHeader = true,
  showTrafficLights = false,
  showCopy = true,
  footer,
  height,
  className,
  style,
}: CodeViewProps) {
  const [copied, setCopied] = useState(false);

  // Track active tab so the copy button copies the right code
  const [currentTabId, setCurrentTabId] = useState(
    controlledActiveTab ?? defaultTab ?? tabs?.[0]?.id ?? '',
  );

  const effectiveTabId = controlledActiveTab ?? currentTabId;

  const handleTabChange = useCallback(
    (tabId: string) => {
      setCurrentTabId(tabId);
      onTabChange?.(tabId);
    },
    [onTabChange],
  );

  const activeTabData = tabs?.find((t) => t.id === effectiveTabId);
  const currentCode = activeTabData?.code ?? code ?? '';
  const currentLanguage = activeTabData?.language ?? language;

  const boxHeader = header ?? label ?? 'Code';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(currentCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard write failed silently
    }
  };

  const actions = showCopy ? (
    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
      <button
        className="elb-explorer-btn"
        onClick={handleCopy}
        title={copied ? 'Copied!' : 'Copy to clipboard'}
      >
        {copied ? (
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : (
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
        )}
      </button>
    </div>
  ) : undefined;

  const boxTabs = tabs?.map((tab) => ({
    id: tab.id,
    label: tab.label,
    content: <CodeStatic code={tab.code} language={tab.language ?? language} />,
  }));

  return (
    <Box
      header={boxHeader}
      headerActions={actions}
      showHeader={showHeader}
      tabs={boxTabs}
      defaultTab={defaultTab}
      activeTab={controlledActiveTab}
      onTabChange={handleTabChange}
      showTrafficLights={showTrafficLights}
      footer={footer}
      height={height}
      style={style}
      className={className}
    >
      {!tabs && <CodeStatic code={code ?? ''} language={currentLanguage} />}
    </Box>
  );
}
