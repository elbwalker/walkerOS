import { useEffect, useState, useRef, useCallback } from 'react';
import type { editor } from 'monaco-editor';

export interface UseMonacoHeightOptions {
  enabled?: boolean;
  minHeight?: number;
  maxHeight?: number;
  defaultHeight?: number;
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
}: UseMonacoHeightOptions = {}): [
  number,
  (editor: editor.IStandaloneCodeEditor | null) => void,
] {
  const [height, setHeight] = useState<number>(defaultHeight);
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

  const updateHeight = useCallback(() => {
    if (!enabled || !editorRef.current) return;

    try {
      const contentHeight = editorRef.current.getContentHeight();
      // Add overhead for header + borders + padding
      const HEADER_OVERHEAD = 45;
      const totalHeight = contentHeight + HEADER_OVERHEAD;
      const boundedHeight = Math.max(
        minHeight,
        Math.min(maxHeight, totalHeight),
      );

      setHeight(boundedHeight);

      // Trigger layout update
      requestAnimationFrame(() => {
        editorRef.current?.layout();
      });
    } catch (error) {
      // Silently fail - editor might not be fully initialized
    }
  }, [enabled, minHeight, maxHeight]);

  const setEditor = useCallback(
    (editor: editor.IStandaloneCodeEditor | null) => {
      editorRef.current = editor;

      if (!enabled || !editor) {
        setHeight(defaultHeight);
        return;
      }

      // Trigger initial height calculation
      setTimeout(() => updateHeight(), 50);

      // Listen for content changes
      const disposable = editor.onDidContentSizeChange(() => {
        updateHeight();
      });

      // Store disposable for cleanup
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (editor as any).__heightDisposable = disposable;
    },
    [enabled, defaultHeight, updateHeight],
  );

  return [height, setEditor];
}
