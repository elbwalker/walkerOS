import { useEffect, useState, useRef, useCallback } from 'react';
import type { editor } from 'monaco-editor';

export interface UseMonacoHeightOptions {
  enabled?: boolean;
  minHeight?: number;
  maxHeight?: number;
  defaultHeight?: number;
  onHeightChange?: (height: number) => void;
}

/**
 * Hook to automatically calculate Monaco Editor height based on content
 *
 * @param enabled - Whether to enable auto-height calculation
 * @param minHeight - Minimum height in pixels (default: 100)
 * @param maxHeight - Maximum height in pixels (default: 800)
 * @param defaultHeight - Default height when not auto-sizing (default: 400)
 *
 * @returns [height, setEditor] - Current height and function to register editor instance
 *
 * @example
 * const [height, setEditor] = useMonacoHeight({ enabled: autoHeight });
 *
 * <Editor
 *   height={height}
 *   onMount={(editor) => setEditor(editor)}
 * />
 */
export function useMonacoHeight({
  enabled = false,
  minHeight = 100,
  maxHeight = 800,
  defaultHeight = 400,
  onHeightChange,
}: UseMonacoHeightOptions = {}): [
  number,
  (editor: editor.IStandaloneCodeEditor | null) => void,
] {
  const [height, setHeight] = useState<number>(
    enabled ? minHeight : defaultHeight,
  );
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const previousHeightRef = useRef<number>(enabled ? minHeight : defaultHeight);
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const updateHeight = useCallback(() => {
    if (!enabled || !editorRef.current) return;

    try {
      const monacoContentHeight = editorRef.current.getContentHeight();
      const boundedMonacoHeight = Math.max(
        minHeight,
        Math.min(maxHeight, monacoContentHeight),
      );

      if (boundedMonacoHeight === previousHeightRef.current) {
        return;
      }

      previousHeightRef.current = boundedMonacoHeight;
      setHeight(boundedMonacoHeight);

      if (onHeightChange) {
        const HEADER_HEIGHT = 36;
        const BORDER = 2;
        const totalBoxHeight = boundedMonacoHeight + HEADER_HEIGHT + BORDER;
        onHeightChange(totalBoxHeight);
      }

      // Note: We don't call editor.layout() here because Monaco's
      // automaticLayout option handles layout updates automatically.
      // Calling layout() here would create a feedback loop with
      // onDidContentSizeChange, causing height to grow indefinitely.
    } catch (error) {
      // Silently fail - editor might not be fully initialized
    }
  }, [enabled, minHeight, maxHeight, onHeightChange]);

  const setEditor = useCallback(
    (editor: editor.IStandaloneCodeEditor | null) => {
      // Clean up previous timeout if it exists
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
        updateTimeoutRef.current = null;
      }

      editorRef.current = editor;

      if (!enabled || !editor) {
        setHeight(defaultHeight);
        previousHeightRef.current = defaultHeight;
        return;
      }

      // Trigger initial height calculation
      setTimeout(() => updateHeight(), 50);

      // Listen for content changes with debouncing
      const disposable = editor.onDidContentSizeChange(() => {
        // Clear any pending update
        if (updateTimeoutRef.current) {
          clearTimeout(updateTimeoutRef.current);
        }

        // Debounce updates to prevent rapid-fire recalculations
        updateTimeoutRef.current = setTimeout(() => {
          updateHeight();
          updateTimeoutRef.current = null;
        }, 150);
      });

      // Store disposable for cleanup
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (editor as any).__heightDisposable = disposable;
    },
    [enabled, defaultHeight, updateHeight],
  );

  return [height, setEditor];
}
