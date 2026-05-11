import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  DiffEditor,
  type DiffOnMount,
  type Monaco,
} from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import {
  ELB_THEME_DARK,
  ELB_THEME_LIGHT,
  registerAllThemes,
} from '../../themes';
import { applyWalkerOSDecorations } from '../../utils/monaco-walkeros-decorations';

export interface CodeDiffSummary {
  /** Count of hunks that exist only in modified (pure additions). */
  added: number;
  /** Count of hunks that exist only in original (pure deletions). */
  deleted: number;
  /** Count of hunks where both sides have differing content. */
  modified: number;
}

export interface CodeDiffProps {
  original: string;
  modified: string;
  /** Any Monaco language id. Default 'json'. */
  language?: string;
  /** Height value passed to DiffEditor. Defaults to '100%'. Parent must size. */
  height?: string | number;
  /** Split view on (default) or inline. Toggle by updating the prop. */
  renderSideBySide?: boolean;
  /** Fires on every Monaco diff update (debounced by Monaco). */
  onSummaryChange?: (summary: CodeDiffSummary) => void;
  /** Escape hatch. */
  beforeMount?: (monaco: Monaco) => void;
  /** Escape hatch — receives the diff editor instance. */
  onMount?: (diffEditor: editor.IStandaloneDiffEditor) => void;
  className?: string;
}

const DIFF_OPTIONS: editor.IStandaloneDiffEditorConstructionOptions = {
  readOnly: true,
  domReadOnly: true,
  originalEditable: false,
  renderIndicators: true,
  renderMarginRevertIcon: false,
  renderGutterMenu: false,
  ignoreTrimWhitespace: false,
  diffAlgorithm: 'advanced',
  experimental: { showMoves: true, useTrueInlineView: true },
  hideUnchangedRegions: {
    enabled: true,
    revealLineCount: 20,
    minimumLineCount: 3,
    contextLineCount: 3,
  },
  useInlineViewWhenSpaceIsLimited: true,
  renderSideBySideInlineBreakpoint: 720,
  fixedOverflowWidgets: true,
  automaticLayout: true,
  minimap: { enabled: false },
  scrollBeyondLastLine: false,
  lineNumbers: 'on',
  lineNumbersMinChars: 3,
  glyphMargin: false,
  lineDecorationsWidth: 8,
  fontSize: 13,
  wordWrap: 'off',
  diffWordWrap: 'inherit',
  renderLineHighlight: 'none',
  overviewRulerLanes: 0,
  scrollbar: {
    vertical: 'auto',
    horizontal: 'auto',
    alwaysConsumeMouseWheel: false,
  },
};

/** Detect the current [data-theme] value from the closest ancestor or document. */
function detectDataTheme(el: HTMLElement | null): string | null {
  if (typeof document === 'undefined') return null;
  if (el) {
    const closest = el.closest('[data-theme]');
    if (closest) return closest.getAttribute('data-theme');
  }
  return document.documentElement.getAttribute('data-theme');
}

/**
 * CodeDiff — read-only Monaco DiffEditor atom.
 *
 * Generic: diffs any Monaco-supported language. Theme follows [data-theme].
 * Use <CodeDiffBox> for the full chrome (header, summary, toggle, copy).
 */
export function CodeDiff({
  original,
  modified,
  language = 'json',
  height = '100%',
  renderSideBySide = true,
  onSummaryChange,
  beforeMount,
  onMount,
  className,
}: CodeDiffProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<editor.IStandaloneDiffEditor | null>(null);
  const decoCleanupRef = useRef<Array<() => void>>([]);
  const summaryCbRef = useRef(onSummaryChange);
  summaryCbRef.current = onSummaryChange;

  // Theme state follows [data-theme]
  const [themeName, setThemeName] = useState<string>(ELB_THEME_LIGHT);
  useEffect(() => {
    const read = () => {
      const dataTheme = detectDataTheme(containerRef.current);
      const isDark =
        dataTheme === 'dark' ||
        (dataTheme === null &&
          window.matchMedia('(prefers-color-scheme: dark)').matches);
      setThemeName(isDark ? ELB_THEME_DARK : ELB_THEME_LIGHT);
    };
    read();
    const observer = new MutationObserver(read);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', read);
    return () => {
      observer.disconnect();
      mq.removeEventListener('change', read);
    };
  }, []);

  // Keep renderSideBySide live — no remount on toggle
  useEffect(() => {
    editorRef.current?.updateOptions({ renderSideBySide });
  }, [renderSideBySide]);

  const handleBeforeMount = useCallback(
    (monaco: Monaco) => {
      registerAllThemes(monaco);
      beforeMount?.(monaco);
    },
    [beforeMount],
  );

  const handleMount: DiffOnMount = useCallback(
    (diffEditor, _monaco) => {
      editorRef.current = diffEditor;

      // Apply walkerOS decoration to all canonical references:
      // $var./$env./$contract./$store./$secret./$code:
      // applyWalkerOSDecorations expects a single IStandaloneCodeEditor.
      decoCleanupRef.current.push(
        applyWalkerOSDecorations(diffEditor.getOriginalEditor()),
      );
      decoCleanupRef.current.push(
        applyWalkerOSDecorations(diffEditor.getModifiedEditor()),
      );

      // Summary: line-level counts. Fires after every diff recompute.
      const update = () => {
        const changes = diffEditor.getLineChanges() ?? [];
        let added = 0;
        let deleted = 0;
        let modifiedCount = 0;
        for (const c of changes) {
          if (c.originalEndLineNumber === 0) added++;
          else if (c.modifiedEndLineNumber === 0) deleted++;
          else modifiedCount++;
        }
        summaryCbRef.current?.({ added, deleted, modified: modifiedCount });
      };
      const sub = diffEditor.onDidUpdateDiff(update);
      decoCleanupRef.current.push(() => sub.dispose());

      onMount?.(diffEditor);
    },
    [onMount],
  );

  useEffect(() => {
    return () => {
      // Guard each cleanup — Monaco methods (deltaDecorations) throw if the
      // underlying editor was already disposed by @monaco-editor/react.
      for (const cleanup of decoCleanupRef.current) {
        try {
          cleanup();
        } catch {
          /* already disposed — ignore */
        }
      }
      decoCleanupRef.current = [];
    };
  }, []);

  const mergedOptions =
    useMemo<editor.IStandaloneDiffEditorConstructionOptions>(
      () => ({ ...DIFF_OPTIONS, renderSideBySide }),
      [renderSideBySide],
    );

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ height: '100%', width: '100%' }}
    >
      <DiffEditor
        language={language}
        original={original}
        modified={modified}
        theme={themeName}
        height={height}
        options={mergedOptions}
        beforeMount={handleBeforeMount}
        onMount={handleMount}
      />
    </div>
  );
}
