import React, {
  type ComponentType,
  useEffect,
  useState,
  useRef,
  useCallback,
} from 'react';
import { Editor, loader } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import { registerAllThemes } from '../../themes';
import {
  configureMonacoTypeScript,
  registerWalkerOSAmbients,
  registerWalkerOSTypes,
} from '../../utils/monaco-types';
import {
  applyDataElbDecorations,
  registerDataElbStyles,
} from '../../utils/monaco-decorators';
import {
  applyWalkerOSDecorations,
  registerWalkerOSDecorationStyles,
} from '../../utils/monaco-walkeros-decorations';
import {
  registerWalkerOSProviders,
  setIntelliSenseContext,
  removeIntelliSenseContext,
} from '../../utils/monaco-walkeros-providers';
import { registerFormatters } from '../../utils/monaco-formatters';
import {
  generateModelPath,
  initMonacoJson,
  registerJsonSchema,
  unregisterJsonSchema,
} from '../../utils/monaco-json-schema';
import { useMonacoHeight } from '../../hooks/useMonacoHeight';
import { useGridHeight } from '../../contexts/GridHeightContext';

// Monaco Editor configuration
// NOTE: MonacoEnvironment.getWorker and loader.config() should be configured
// by the consuming application. See examples in the explorer app's main.tsx
import type * as monaco from 'monaco-editor';
import type { IntelliSenseContext } from '../../types/intellisense';

// Run Monaco base setup exactly once at module load — before any <Editor>
// mounts. Doing this during `beforeMount` of an editor invalidates any
// in-flight TypeScript worker operations from sibling editors mounted in
// parallel, which leak as `{ type: 'cancelation' }` unhandled rejections.
if (typeof window !== 'undefined') {
  loader
    .init()
    .then((m) => {
      configureMonacoTypeScript(m);
      registerWalkerOSAmbients(m);
    })
    .catch((err) => {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[walkerOS] Monaco loader.init() failed:', err);
      }
    });
}

export interface CodeProps {
  code: string;
  language?: string;
  onChange?: (code: string) => void;
  disabled?: boolean;
  lineNumbers?: boolean;
  minimap?: boolean;
  folding?: boolean;
  wordWrap?: boolean;
  className?: string;
  beforeMount?: (monaco: typeof import('monaco-editor')) => void;
  onMount?: (editor: editor.IStandaloneCodeEditor) => void;
  autoHeight?: boolean | { min?: number; max?: number };
  fontSize?: number;
  packages?: string[];
  sticky?: boolean; // Enable sticky scroll (default: true)
  ide?: boolean; // Enable IDE features: hover, validation, etc. (default: false)
  /** JSON Schema (Draft 7) for validation and IntelliSense in JSON mode */
  jsonSchema?: Record<string, unknown>;
  /** Context data for dynamic IntelliSense (variable names, secrets, etc.) */
  intellisenseContext?: IntelliSenseContext;
  /** Validation function — called on content change, results rendered as Monaco markers */
  validate?: (code: string) => {
    valid: boolean;
    errors: Array<{
      message: string;
      severity: 'error' | 'warning';
      line: number;
      column: number;
      endLine?: number;
      endColumn?: number;
    }>;
    warnings: Array<{
      message: string;
      severity: 'error' | 'warning';
      line: number;
      column: number;
      endLine?: number;
      endColumn?: number;
    }>;
  };
  /** Callback when Monaco marker counts change */
  onMarkerCounts?: (info: {
    errors: number;
    warnings: number;
    markers: Array<{
      message: string;
      severity: 'error' | 'warning';
      line: number;
      column: number;
    }>;
  }) => void;
}

/**
 * Code - Pure Monaco editor atom
 *
 * Height Management:
 * Two modes controlled by `autoHeight` prop:
 *
 * 1. Default (autoHeight=false): height="100%" - fills parent container
 *    - Uses flex: 1 + min-height: 0 for proper flex overflow containment
 *    - Monaco set to height="100%" to fill container
 *    - automaticLayout: true + ResizeObserver for reliable resize detection
 *    - Use in Grid (equal heights) and Flex contexts (fill parent)
 *
 * 2. Auto-height (autoHeight=true): Dynamically sizes to content
 *    - Uses Monaco's getContentHeight() API for accurate content measurement
 *    - Respects min/max boundaries (default: 100-600px)
 *    - Updates automatically when content changes
 *    - Use in standalone contexts (docs) to eliminate blank space
 *
 * @example
 * // Grid context - use default height="100%" for equal row heights
 * <Grid columns={3}>
 *   <CodeBox code={event} />
 *   <CodeBox code={mapping} />
 * </Grid>
 *
 * @example
 * // Standalone context - use autoHeight to fit content
 * <CodeBox
 *   code={shortExample}
 *   autoHeight={{ min: 100, max: 600 }}
 * />
 */
export function Code({
  code,
  language = 'javascript',
  onChange,
  disabled = false,
  lineNumbers = false,
  minimap = false,
  folding = false,
  wordWrap = false,
  className,
  beforeMount,
  onMount,
  autoHeight,
  fontSize = 13,
  packages,
  sticky = true,
  ide = false,
  jsonSchema,
  intellisenseContext,
  validate,
  onMarkerCounts,
}: CodeProps) {
  // Track if component has mounted (client-side hydration complete)
  const [isMounted, setIsMounted] = useState(false);
  // Use a consistent default theme for SSR - only update after mount
  const [monacoTheme, setMonacoTheme] = useState('vs-light');
  const decorationsCleanupRef = useRef<Array<() => void>>([]);
  const monacoRef = useRef<typeof import('monaco-editor') | null>(null);
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const gridContext = useGridHeight();
  const boxIdRef = useRef<number | null>(null);

  if (gridContext?.enabled && boxIdRef.current === null) {
    boxIdRef.current = gridContext.getBoxId();
  }

  const handleHeightChange = useCallback(
    (height: number) => {
      if (gridContext?.enabled && boxIdRef.current !== null) {
        gridContext.registerBox(boxIdRef.current, height);
      }
    },
    [gridContext],
  );

  useEffect(() => {
    return () => {
      if (gridContext?.enabled && boxIdRef.current !== null) {
        gridContext.unregisterBox(boxIdRef.current);
      }
    };
  }, [gridContext]);

  const heightConfig = typeof autoHeight === 'object' ? autoHeight : {};
  const [calculatedHeight, registerEditor] = useMonacoHeight({
    enabled: !!autoHeight || !!gridContext?.enabled,
    minHeight: heightConfig.min ?? (gridContext?.enabled ? 1 : 20),
    maxHeight: heightConfig.max ?? 600,
    defaultHeight: gridContext?.enabled ? 250 : 400,
    onHeightChange: handleHeightChange,
  });

  // Register data-elb styles on mount
  useEffect(() => {
    registerDataElbStyles();
  }, []);

  // Helper: Find data-theme attribute from closest ancestor or document
  // Returns null during SSR (no document available)
  const getDataTheme = useCallback((): string | null => {
    if (typeof document === 'undefined') return null;

    // Check container ref first (closest to Monaco)
    if (containerRef.current) {
      const closest = containerRef.current.closest('[data-theme]');
      if (closest) {
        return closest.getAttribute('data-theme');
      }
    }

    // Fall back to document root
    return document.documentElement.getAttribute('data-theme');
  }, []);

  // Mark component as mounted (hydration complete)
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Theme detection - only runs after mount to prevent hydration mismatch
  useEffect(() => {
    if (!isMounted) return;

    const checkTheme = () => {
      const dataTheme = getDataTheme();
      const isDark =
        dataTheme === 'dark' ||
        (dataTheme === null &&
          window.matchMedia('(prefers-color-scheme: dark)').matches);
      const newTheme = isDark ? 'elbTheme-dark' : 'elbTheme-light';

      setMonacoTheme(newTheme);
    };

    checkTheme();

    const observer = new MutationObserver(() => {
      checkTheme();
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      checkTheme();
    };
    mediaQuery.addEventListener('change', handleChange);

    return () => {
      observer.disconnect();
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, [isMounted, getDataTheme]);

  // ResizeObserver for container size changes
  // Complements automaticLayout: true for more reliable detection
  // Handles cases where Grid constraints change or parent container resizes
  useEffect(() => {
    const editor = editorRef.current;
    const container = containerRef.current;

    if (!editor || !container) return;

    const resizeObserver = new ResizeObserver(() => {
      // Debounce layout calls to prevent excessive updates
      requestAnimationFrame(() => {
        editor.layout();
      });
    });

    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // JSON Schema registration for IntelliSense
  const modelPathRef = useRef<string | null>(null);
  const intellisenseContextRef = useRef(intellisenseContext);
  intellisenseContextRef.current = intellisenseContext;
  const validateRef = useRef(validate);
  validateRef.current = validate;
  const onMarkerCountsRef = useRef(onMarkerCounts);
  onMarkerCountsRef.current = onMarkerCounts;

  // Always generate a stable model path with a language-appropriate extension.
  // Monaco's TypeScript worker uses the extension to decide TS vs TSX vs JS
  // parsing. Without this, all snippets default to `.json` paths and TS
  // diagnostics misbehave on any non-JSON content.
  if (!modelPathRef.current) {
    modelPathRef.current = generateModelPath(language);
  }

  // Register/update JSON schema when it changes
  useEffect(() => {
    if (!jsonSchema || !modelPathRef.current) return;

    registerJsonSchema(modelPathRef.current, jsonSchema);

    return () => {
      if (modelPathRef.current) {
        unregisterJsonSchema(modelPathRef.current);
      }
    };
  }, [jsonSchema]);

  // Sync intellisenseContext with provider registry
  useEffect(() => {
    if (intellisenseContext && modelPathRef.current) {
      setIntelliSenseContext(modelPathRef.current, intellisenseContext);
      return () => {
        if (modelPathRef.current) {
          removeIntelliSenseContext(modelPathRef.current);
        }
      };
    }
  }, [intellisenseContext]);

  const handleChange = (value: string | undefined) => {
    if (onChange && value !== undefined) {
      onChange(value);
    }
  };

  const handleBeforeMount = async (monaco: typeof import('monaco-editor')) => {
    monacoRef.current = monaco;

    // Initialize JSON schema registry with this monaco instance
    initMonacoJson(monaco);

    // Always run built-in setup
    registerAllThemes(monaco);
    registerFormatters(monaco);

    // Monaco base setup (compiler options + ambient globals) runs once at
    // module load via `loader.init()`. The WeakSet guards inside those
    // functions make them no-ops here even if called again.

    if (packages && packages.length > 0) {
      registerWalkerOSTypes(monaco);

      const { loadPackageTypes } = await import('../../utils/monaco-types');
      for (const pkg of packages) {
        if (pkg !== '@walkeros/core') {
          await loadPackageTypes(monaco, { package: pkg }).catch(() => {});
        }
      }
    }

    const dataTheme = getDataTheme();
    const isDark =
      dataTheme === 'dark' ||
      (dataTheme === null &&
        window.matchMedia('(prefers-color-scheme: dark)').matches);
    const themeName = isDark ? 'elbTheme-dark' : 'elbTheme-light';
    monaco.editor.setTheme(themeName);

    // Register walkerOS IntelliSense providers for JSON
    if (language === 'json') {
      registerWalkerOSProviders(monaco);
    }

    // Call user's beforeMount AFTER built-in setup
    if (beforeMount) {
      beforeMount(monaco);
    }
  };

  const MonacoEditor = Editor as ComponentType<{
    height: string;
    language: string;
    value: string;
    onChange: (value: string | undefined) => void;
    beforeMount?: (monaco: typeof import('monaco-editor')) => void;
    onMount?: (editor: editor.IStandaloneCodeEditor) => void;
    theme: string;
    options: Record<string, unknown>;
    path?: string; // Model URI for JSON schema fileMatch
  }>;

  const handleEditorMount = (monacoEditor: editor.IStandaloneCodeEditor) => {
    editorRef.current = monacoEditor;

    // Register with height hook if auto-height or grid context is enabled
    if (autoHeight || gridContext?.enabled) {
      registerEditor(monacoEditor);
    }

    // Apply data-elb decorations for HTML
    if (language === 'html' && monacoRef.current) {
      decorationsCleanupRef.current.push(
        applyDataElbDecorations(monacoEditor, monacoRef.current),
      );
    }

    // Apply walkerOS reference decorations for JSON
    if (language === 'json') {
      registerWalkerOSDecorationStyles();
      decorationsCleanupRef.current.push(
        applyWalkerOSDecorations(monacoEditor),
      );
    }

    // Run validation from validate prop (replaces internal walkerOS markers)
    if (validateRef.current && monacoRef.current) {
      const monacoInstance = monacoRef.current;
      let validateTimer: ReturnType<typeof setTimeout>;

      const runValidation = () => {
        const model = monacoEditor.getModel();
        if (!model) return;
        const text = model.getValue();
        const fn = validateRef.current;
        if (!fn) return;

        const result = fn(text);
        const allIssues = [...result.errors, ...result.warnings];

        monacoInstance.editor.setModelMarkers(
          model,
          'validate',
          allIssues.map((issue) => ({
            severity: issue.severity === 'error' ? 8 : 4,
            message: issue.message,
            startLineNumber: issue.line,
            startColumn: issue.column,
            endLineNumber: issue.endLine ?? issue.line,
            endColumn: issue.endColumn ?? issue.column + 1,
          })),
        );

        // Don't report here — the global marker listener below handles it
      };

      // Initial validation
      runValidation();

      // Debounced validation on content change
      const validateDisposable = monacoEditor.onDidChangeModelContent(() => {
        clearTimeout(validateTimer);
        validateTimer = setTimeout(runValidation, 300);
      });

      decorationsCleanupRef.current.push(() => {
        clearTimeout(validateTimer);
        validateDisposable.dispose();
      });
    }

    // Listen for marker changes and report counts to CodeBox header badges.
    // When a custom validate prop is provided, it is the single source of truth
    // (same validator the CLI uses). Clear Monaco's built-in JSON diagnostics
    // so they don't double-count.
    if (onMarkerCountsRef.current && monacoRef.current) {
      const monacoInstance = monacoRef.current;
      const model = monacoEditor.getModel();
      const hasCustomValidate = !!validateRef.current;
      if (model) {
        const reportMarkers = () => {
          // When custom validate owns validation, strip Monaco's JSON markers
          if (hasCustomValidate) {
            monacoInstance.editor.setModelMarkers(model, 'json', []);
          }
          const raw = monacoInstance.editor.getModelMarkers({
            resource: model.uri,
          });
          let errors = 0;
          let warnings = 0;
          const details: Array<{
            message: string;
            severity: 'error' | 'warning';
            line: number;
            column: number;
          }> = [];
          for (const m of raw) {
            if (m.severity === 8) {
              errors++;
              details.push({
                message: m.message,
                severity: 'error',
                line: m.startLineNumber,
                column: m.startColumn,
              });
            } else if (m.severity === 4) {
              warnings++;
              details.push({
                message: m.message,
                severity: 'warning',
                line: m.startLineNumber,
                column: m.startColumn,
              });
            }
          }
          onMarkerCountsRef.current?.({ errors, warnings, markers: details });
        };

        const markerDisposable = monacoInstance.editor.onDidChangeMarkers(
          (uris) => {
            if (uris.some((uri) => uri.toString() === model.uri.toString())) {
              reportMarkers();
            }
          },
        );

        // Initial report (catches markers set before listener)
        requestAnimationFrame(reportMarkers);

        decorationsCleanupRef.current.push(() => {
          markerDisposable.dispose();
        });
      }
    }

    // Initial layout call after mount
    requestAnimationFrame(() => {
      monacoEditor.layout();
    });

    if (onMount) {
      onMount(monacoEditor);
    }
  };

  // Cleanup
  useEffect(() => {
    return () => {
      for (const cleanup of decorationsCleanupRef.current) {
        cleanup();
      }
      decorationsCleanupRef.current = [];
    };
  }, []);

  // Choose height strategy: auto-calculated or fill parent
  // Note: When grid context is enabled with synced mode, CodeBox applies
  // syncedHeight to the Box container. Monaco should use calculatedHeight
  // (content-only) here, not syncedHeight (which includes header + border).
  const monacoHeight =
    autoHeight || gridContext?.enabled ? `${calculatedHeight}px` : '100%';

  // Add modifier class when using auto-height or synced height
  const useContentHeight = !!autoHeight || !!gridContext?.enabled;
  const codeClassName =
    `elb-code ${useContentHeight ? 'elb-code--auto-height' : ''} ${className || ''}`.trim();

  return (
    <div className={codeClassName} ref={containerRef}>
      <MonacoEditor
        height={monacoHeight}
        language={language}
        value={code}
        onChange={handleChange}
        beforeMount={handleBeforeMount}
        onMount={handleEditorMount}
        theme={monacoTheme}
        path={modelPathRef.current || undefined}
        options={{
          readOnly: disabled || !onChange,
          readOnlyMessage: { value: '' },
          minimap: { enabled: minimap },
          fontSize: fontSize,
          lineHeight: Math.round(fontSize * 1.5),
          padding: 0,
          lineNumbers: lineNumbers ? 'on' : 'off',
          lineNumbersMinChars: 3,
          glyphMargin: false,
          folding: folding,
          lineDecorationsWidth: 8, // Gap between line numbers and code
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 2,
          detectIndentation: false,
          trimAutoWhitespace: false,
          wordWrap: wordWrap ? 'on' : 'off',
          fixedOverflowWidgets: true,
          overviewRulerLanes: 0,
          renderLineHighlight: 'none',
          renderValidationDecorations: ide || jsonSchema ? 'editable' : 'off',
          hover: { enabled: ide || !!jsonSchema || !!intellisenseContext },
          'semanticHighlighting.enabled': ide,
          showDeprecated: ide,
          showUnused: ide,
          'bracketPairColorization.enabled': false,
          guides: {
            bracketPairs: false,
            bracketPairsHorizontal: false,
            highlightActiveBracketPair: false,
            indentation: false, // Disable indentation guide lines
          },
          scrollbar: {
            vertical: 'auto',
            horizontal: 'auto',
            alwaysConsumeMouseWheel: false,
          },
          // Cursor and selection behavior
          cursorBlinking: 'blink', // Make cursor blink visibly
          cursorStyle: 'line', // Use line cursor (most visible)
          cursorWidth: 2, // Make cursor 2px wide for better visibility
          cursorSmoothCaretAnimation: 'off', // Disable smooth cursor animation
          selectionHighlight: false, // Disable auto-highlighting of selected text occurrences
          occurrencesHighlight: 'off', // Disable highlighting matching words
          selectOnLineNumbers: false, // Don't select line when clicking line numbers
          wordBasedSuggestions: 'off', // Reduce auto-completion interference
          quickSuggestions:
            jsonSchema || intellisenseContext
              ? { strings: true, other: true, comments: false }
              : false,
          stickyScroll: { enabled: sticky },
        }}
      />
    </div>
  );
}
