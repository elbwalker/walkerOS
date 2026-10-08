import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Box } from '../atoms/box';
import type { editor } from 'monaco-editor';
import { CodeDiff, type CodeDiffSummary } from '../atoms/code-diff';

const ICON_PROPS = {
  width: 14,
  height: 14,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

export interface CodeDiffBoxProps {
  original: string;
  modified: string;
  language?: string;

  // Header (mirrors CodeBox)
  label?: string;
  header?: string;
  showHeader?: boolean;
  showTrafficLights?: boolean;

  // Actions
  /** Show copy-modified button in header. Default true. */
  showCopy?: boolean;
  /** Show split|inline toggle in header. Default true. */
  showViewToggle?: boolean;
  /** Show +N/-N/~N summary badges in header. Default false. */
  showSummary?: boolean;
  /** Initial view mode. Default 'split'. */
  defaultView?: 'split' | 'inline';

  // Layout (mirrors CodeBox)
  footer?: React.ReactNode;
  height?: string | number;
  style?: React.CSSProperties;
  className?: string;

  // Escape hatches
  onMount?: (diffEditor: editor.IStandaloneDiffEditor) => void;
}

function SummaryBadges({ summary }: { summary: CodeDiffSummary }) {
  return (
    <div className="elb-code-diff-box__summary">
      <span className="elb-code-diff-box__added">+{summary.added}</span>
      <span className="elb-code-diff-box__deleted">-{summary.deleted}</span>
      <span className="elb-code-diff-box__modified">~{summary.modified}</span>
    </div>
  );
}

function ViewToggle({
  view,
  onChange,
}: {
  view: 'split' | 'inline';
  onChange: (v: 'split' | 'inline') => void;
}) {
  const buttonClass = (mode: 'split' | 'inline') =>
    `elb-explorer-btn${view === mode ? ' active' : ''}`;
  return (
    <div
      className="elb-explorer-button-group elb-code-diff-box__toggle"
      aria-label="Diff view mode"
    >
      <button
        type="button"
        className={buttonClass('split')}
        aria-pressed={view === 'split'}
        onClick={() => onChange('split')}
      >
        Split
      </button>
      <button
        type="button"
        className={buttonClass('inline')}
        aria-pressed={view === 'inline'}
        onClick={() => onChange('inline')}
      >
        Inline
      </button>
    </div>
  );
}

function CopyButton({ value }: { value: string }) {
  const [status, setStatus] = useState<'idle' | 'copied' | 'failed'>('idle');
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, []);

  const onClick = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setStatus('copied');
    } catch {
      setStatus('failed');
    }
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setStatus('idle'), 2000);
  };

  const label =
    status === 'copied'
      ? 'Copied!'
      : status === 'failed'
        ? 'Copy failed'
        : 'Copy modified to clipboard';

  return (
    <button
      type="button"
      className="elb-explorer-btn"
      onClick={onClick}
      title={label}
      aria-label="Copy modified content"
    >
      <span className="elb-explorer-sr-only" aria-live="polite">
        {status !== 'idle' ? label : ''}
      </span>
      {status === 'copied' ? (
        <svg {...ICON_PROPS}>
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ) : (
        <svg {...ICON_PROPS}>
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
      )}
    </button>
  );
}

/**
 * CodeDiffBox, read-only diff viewer with Box chrome.
 *
 * Generic: diffs any Monaco-supported language. Mirrors CodeBox's API where
 * overlapping. Use for flow.json diffs, inline TypeScript code diffs, or any
 * two strings of source.
 */
export function CodeDiffBox({
  original,
  modified,
  language = 'json',
  label,
  header,
  showHeader = true,
  showTrafficLights = false,
  showCopy = true,
  showViewToggle = true,
  showSummary = false,
  defaultView = 'split',
  footer,
  height,
  style,
  className,
  onMount,
}: CodeDiffBoxProps) {
  const [view, setView] = useState<'split' | 'inline'>(defaultView);
  const [summary, setSummary] = useState<CodeDiffSummary>({
    added: 0,
    deleted: 0,
    modified: 0,
  });

  const summaryCb = useCallback((s: CodeDiffSummary) => setSummary(s), []);
  const boxHeader = header ?? label ?? 'Diff';

  const actions = (
    <div className="elb-code-diff-box__actions">
      {showSummary && <SummaryBadges summary={summary} />}
      {showViewToggle && <ViewToggle view={view} onChange={setView} />}
      {showCopy && <CopyButton value={modified} />}
    </div>
  );

  return (
    <Box
      header={boxHeader}
      headerActions={actions}
      showHeader={showHeader}
      showTrafficLights={showTrafficLights}
      footer={footer}
      height={height}
      style={style}
      className={`elb-explorer-box--code ${className || ''}`.trim()}
      theme="dark"
    >
      <CodeDiff
        original={original}
        modified={modified}
        language={language}
        renderSideBySide={view === 'split'}
        onSummaryChange={summaryCb}
        onMount={onMount}
      />
    </Box>
  );
}
