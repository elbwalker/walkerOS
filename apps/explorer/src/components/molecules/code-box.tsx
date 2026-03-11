import React, { useState, useCallback, useRef, useEffect } from 'react';
import type { editor } from 'monaco-editor';
import { useMonaco } from '@monaco-editor/react';
import { Box } from '../atoms/box';
import { Code, type CodeProps } from '../atoms/code';

/**
 * Tab with code content for CodeBox
 */
export interface CodeBoxTab {
  id: string;
  label: string;
  code: string;
  language?: string; // Optional, defaults to CodeBox's language prop
}

export interface CodeBoxProps extends Omit<CodeProps, 'code'> {
  // Single code mode (backward compat)
  code?: string;

  // Header (use header OR tabs, not both)
  label?: string; // Shorthand for header
  header?: string; // Box header prop
  showHeader?: boolean;

  // Tabs with code content
  tabs?: CodeBoxTab[];
  activeTab?: string;
  onTabChange?: (id: string) => void;
  defaultTab?: string;

  // Visual options
  showTrafficLights?: boolean;

  // Actions
  showCopy?: boolean;
  showFormat?: boolean;
  showSettings?: boolean;

  /** Callback when validation issues change. Use to disable Save when errors > 0. */
  onValidationIssues?: (counts: { errors: number; warnings: number }) => void;

  // Layout
  footer?: React.ReactNode;
  height?: string | number;
  style?: React.CSSProperties;
}

/**
 * CodeBox - Monaco editor wrapped in a Box with header and actions
 *
 * Molecule that combines Box + Code atom + toolbar actions.
 * Use this when you need an editor with header, copy, and format buttons.
 * Use Code atom directly when you need an editor without Box wrapper.
 *
 * Height Behavior:
 *
 * Three height modes:
 * 1. Grid context: Equal row heights (250-450px), fills available space
 * 2. Explicit height prop: Fixed height (e.g., height={600} or height="50vh")
 * 3. Auto-height prop: Dynamically sizes to content (min-max boundaries)
 *
 * @example
 * // Grid context - use default (no autoHeight) for equal row heights
 * <Grid columns={3}>
 *   <CodeBox code={event} label="Event" showCopy />
 *   <CodeBox code={mapping} label="Mapping" showFormat />
 *   <CodeBox code={output} label="Output" disabled />
 * </Grid>
 *
 * @example
 * // Standalone with auto-height - fits content, no blank space
 * <CodeBox
 *   code={setupCode}
 *   label="Setup"
 *   autoHeight={{ min: 100, max: 600 }}
 *   disabled
 * />
 *
 * @example
 * // Explicit height override
 * <CodeBox
 *   code={largeConfig}
 *   label="Configuration"
 *   height={600}
 *   showFormat
 * />
 */
export function CodeBox({
  // Code props (single code mode)
  code,
  language = 'javascript',
  onChange,
  disabled = false,
  autoHeight,
  // Header
  label,
  header,
  showHeader = true,
  // Tabs with code content
  tabs,
  activeTab: controlledActiveTab,
  onTabChange,
  defaultTab,
  // Visual
  showTrafficLights = false,
  // Actions
  showCopy = true,
  showFormat = false,
  showSettings = false,
  // Validation
  onValidationIssues,
  // Layout
  footer,
  height,
  style,
  className,
  ...codeProps
}: CodeBoxProps) {
  const { onMount: userOnMount, ...restCodeProps } = codeProps;
  const monaco = useMonaco();
  const [copied, setCopied] = useState(false);
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);
  const [settings, setSettings] = useState({
    lineNumbers: false,
    minimap: false,
    wordWrap: false,
    sticky: true,
  });
  const settingsRef = useRef<HTMLDivElement>(null);
  type MarkerDetail = {
    message: string;
    severity: 'error' | 'warning';
    line: number;
    column: number;
  };
  const [markerCounts, setMarkerCounts] = useState({ errors: 0, warnings: 0 });
  const [markerDetails, setMarkerDetails] = useState<MarkerDetail[]>([]);
  const [openMarkerMenu, setOpenMarkerMenu] = useState<
    'error' | 'warning' | null
  >(null);
  const markerMenuRef = useRef<HTMLDivElement>(null);
  const editorInstanceRef = useRef<editor.IStandaloneCodeEditor | null>(null);

  useEffect(() => {
    if (!showSettingsPanel && !openMarkerMenu) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        showSettingsPanel &&
        settingsRef.current &&
        !settingsRef.current.contains(e.target as Node)
      ) {
        setShowSettingsPanel(false);
      }
      if (
        openMarkerMenu &&
        markerMenuRef.current &&
        !markerMenuRef.current.contains(e.target as Node)
      ) {
        setOpenMarkerMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showSettingsPanel, openMarkerMenu]);

  // Track active tab for copy button (Box handles tab state, we just observe)
  const [currentTabId, setCurrentTabId] = useState(
    controlledActiveTab ?? defaultTab ?? tabs?.[0]?.id ?? '',
  );

  // Update internal tracking when controlled prop changes
  const effectiveTabId = controlledActiveTab ?? currentTabId;

  // Wrap user's onTabChange to also update our tracking
  const handleTabChange = useCallback(
    (tabId: string) => {
      setCurrentTabId(tabId);
      onTabChange?.(tabId);
    },
    [onTabChange],
  );

  // Get current code for copy/format buttons
  const activeTabData = tabs?.find((t) => t.id === effectiveTabId);
  const currentCode = activeTabData?.code ?? code ?? '';
  const currentLanguage = activeTabData?.language ?? language;

  // Use label as fallback for header (backward compat)
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

  const handleFormat = () => {
    if (!onChange || disabled || currentLanguage !== 'json') return;

    try {
      const parsed = JSON.parse(currentCode);
      const formatted = JSON.stringify(parsed, null, 2);
      onChange(formatted);
    } catch (e) {
      // Invalid JSON, do nothing
    }
  };

  const handleEditorMount = useCallback(
    (monacoEditor: editor.IStandaloneCodeEditor) => {
      editorInstanceRef.current = monacoEditor;
      userOnMount?.(monacoEditor);
    },
    [userOnMount],
  );

  const handleMarkerCounts = useCallback(
    (info: { errors: number; warnings: number; markers: MarkerDetail[] }) => {
      setMarkerCounts({ errors: info.errors, warnings: info.warnings });
      setMarkerDetails(info.markers);
      onValidationIssues?.({ errors: info.errors, warnings: info.warnings });
    },
    [onValidationIssues],
  );

  const jumpToLine = useCallback((line: number, column: number) => {
    const ed = editorInstanceRef.current;
    if (!ed) return;
    ed.revealLineInCenter(line);
    ed.setPosition({ lineNumber: line, column });
    ed.focus();
    setOpenMarkerMenu(null);
  }, []);

  const settingsProps = {
    lineNumbers: settings.lineNumbers,
    minimap: settings.minimap,
    wordWrap: settings.wordWrap,
    sticky: settings.sticky,
  };

  // Build header actions
  const actions = (
    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
      {markerCounts.errors > 0 && (
        <div
          ref={openMarkerMenu === 'error' ? markerMenuRef : undefined}
          style={{ position: 'relative' }}
        >
          <button
            className="elb-codebox-marker-badge elb-codebox-marker-badge--error"
            onClick={() =>
              setOpenMarkerMenu(openMarkerMenu === 'error' ? null : 'error')
            }
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
            <span>{markerCounts.errors}</span>
          </button>
          {openMarkerMenu === 'error' && (
            <MarkerMenu
              markers={markerDetails.filter((m) => m.severity === 'error')}
              onJump={jumpToLine}
            />
          )}
        </div>
      )}
      {markerCounts.warnings > 0 && (
        <div
          ref={openMarkerMenu === 'warning' ? markerMenuRef : undefined}
          style={{ position: 'relative' }}
        >
          <button
            className="elb-codebox-marker-badge elb-codebox-marker-badge--warning"
            onClick={() =>
              setOpenMarkerMenu(openMarkerMenu === 'warning' ? null : 'warning')
            }
          >
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
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <circle cx="12" cy="17" r=".5" />
            </svg>
            <span>{markerCounts.warnings}</span>
          </button>
          {openMarkerMenu === 'warning' && (
            <MarkerMenu
              markers={markerDetails.filter((m) => m.severity === 'warning')}
              onJump={jumpToLine}
            />
          )}
        </div>
      )}
      {showFormat && !disabled && currentLanguage === 'json' && (
        <button
          className="elb-explorer-btn"
          onClick={handleFormat}
          title="Format JSON"
        >
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
            <line x1="3" y1="5" x2="16" y2="5" />
            <line x1="7" y1="10" x2="20" y2="10" />
            <line x1="7" y1="15" x2="18" y2="15" />
            <line x1="3" y1="20" x2="12" y2="20" />
          </svg>
        </button>
      )}
      {showCopy && (
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
      )}
      {showSettings && (
        <div ref={settingsRef} style={{ position: 'relative' }}>
          <button
            className={`elb-explorer-btn${showSettingsPanel ? ' active' : ''}`}
            onClick={() => setShowSettingsPanel(!showSettingsPanel)}
            title="Editor settings"
          >
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
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
          {showSettingsPanel && (
            <div className="elb-codebox-settings">
              <label className="elb-codebox-settings-option">
                <input
                  type="checkbox"
                  checked={settings.lineNumbers}
                  onChange={() =>
                    setSettings((s) => ({ ...s, lineNumbers: !s.lineNumbers }))
                  }
                />
                Line numbers
              </label>
              <label className="elb-codebox-settings-option">
                <input
                  type="checkbox"
                  checked={settings.minimap}
                  onChange={() =>
                    setSettings((s) => ({ ...s, minimap: !s.minimap }))
                  }
                />
                Minimap
              </label>
              <label className="elb-codebox-settings-option">
                <input
                  type="checkbox"
                  checked={settings.wordWrap}
                  onChange={() =>
                    setSettings((s) => ({ ...s, wordWrap: !s.wordWrap }))
                  }
                />
                Word wrap
              </label>
              <label className="elb-codebox-settings-option">
                <input
                  type="checkbox"
                  checked={settings.sticky}
                  onChange={() =>
                    setSettings((s) => ({ ...s, sticky: !s.sticky }))
                  }
                />
                Sticky scroll
              </label>
            </div>
          )}
        </div>
      )}
    </div>
  );

  // Auto-height class for content-based sizing (Box handles gridContext)
  const autoHeightClass = autoHeight ? 'elb-box--auto-height' : '';
  const boxClassName = `${autoHeightClass} ${className || ''}`.trim();

  // Convert CodeBoxTab[] to BoxTab[] with Code as content (Box handles rendering)
  const boxTabs = tabs?.map((tab) => ({
    id: tab.id,
    label: tab.label,
    content: (
      <Code
        code={tab.code}
        language={tab.language ?? language}
        onChange={onChange}
        disabled={disabled}
        autoHeight={autoHeight}
        onMount={handleEditorMount}
        onMarkerCounts={handleMarkerCounts}
        {...restCodeProps}
        {...settingsProps}
      />
    ),
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
      className={boxClassName}
    >
      {/* Only render Code as children when no tabs (single code mode) */}
      {!tabs && (
        <Code
          code={code ?? ''}
          language={language}
          onChange={onChange}
          disabled={disabled}
          autoHeight={autoHeight}
          onMount={handleEditorMount}
          onMarkerCounts={handleMarkerCounts}
          {...restCodeProps}
          {...settingsProps}
        />
      )}
    </Box>
  );
}

function MarkerMenu({
  markers,
  onJump,
}: {
  markers: Array<{ message: string; line: number; column: number }>;
  onJump: (line: number, column: number) => void;
}) {
  return (
    <div className="elb-codebox-marker-menu">
      {markers
        .sort((a, b) => a.line - b.line || a.column - b.column)
        .map((m, i) => (
          <button
            key={i}
            className="elb-codebox-marker-menu-item"
            onClick={() => onJump(m.line, m.column)}
          >
            <span className="elb-codebox-marker-menu-line">Ln {m.line}</span>
            <span className="elb-codebox-marker-menu-msg">{m.message}</span>
          </button>
        ))}
    </div>
  );
}
