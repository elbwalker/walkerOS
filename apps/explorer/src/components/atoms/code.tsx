import React, {
  type ComponentType,
  useEffect,
  useRef,
  useCallback,
} from 'react';
import { Editor, loader, type Monaco } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import { registerTheme, ELB_THEME_DARK } from '../../themes';
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
import { isMonacoCancellation } from '../../utils/is-monaco-cancellation';

// Monaco Editor configuration
// NOTE: MonacoEnvironment.getWorker and loader.config() should be configured
// by the consuming application before the first editor mounts. See the
// example in .storybook/monaco-setup.ts
import type * as monaco from 'monaco-editor';
import type { IntelliSenseContext } from '../../types/intellisense';

// Suppress Monaco loader cancellation rejections at the window level. See
// `isMonacoCancellation` for the full rationale. ES modules evaluate once, so
// the listener registers once per module graph. HMR re-execution may add a
// duplicate in dev, which is harmless (preventDefault on an already-prevented
// event is a no-op).
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    if (isMonacoCancellation(event.reason)) {
      event.preventDefault();
    }
  });
}

function warnInDev(message: string, err: unknown): void {
  if (process.env.NODE_ENV !== 'production') {
    console.warn(`[walkerOS] ${message}`, err);
  }
}

/**
 * Setup shared by every editor: TypeScript compiler options and the walkerOS
 * ambient globals. Both invalidate running TypeScript workers and cancel their
 * pending work (leaking `{ type: 'cancelation' }` unhandled rejections), so
 * they must land before the first editor exists. The WeakSet guards inside
 * make every call after the first a no-op. A failure, such as a Monaco build
 * without TypeScript, is only reported, so the rest of an editor's setup
 * still runs.
 */
export function prepareMonaco(monaco: Monaco): void {
  try {
    configureMonacoTypeScript(monaco);
    registerWalkerOSAmbients(monaco);
  } catch (err) {
    warnInDev('Monaco setup failed:', err);
  }
}

// One promise shared by every Code, created on the first mount, never on
// import. The library's Editor already calls loader.init() itself and the
// loader loads Monaco once, so this only chains the one-time setup onto that
// load: editors that are not a Code, such as a consumer's own editor mounted
// alongside or after one, get the setup as soon as Monaco exists.
let monacoStart: Promise<void> | undefined;

function startMonaco(): void {
  if (monacoStart) return;
  monacoStart = loader
    .init()
    .then(prepareMonaco)
    .catch((err) => warnInDev('Monaco loader.init() failed:', err));
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
  /**
   * Contain wheel scrolling inside the editor. When true, Monaco consumes
   * mouse-wheel events so scrolling does not chain to the page once the
   * editor reaches its top or bottom (default: false).
   */
  isolateScroll?: boolean;
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
  isolateScroll = false,
  jsonSchema,
  intellisenseContext,
  validate,
  onMarkerCounts,
}: CodeProps) {
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

  // Start Monaco on the first editor mount (effects never run during SSR)
  useEffect(() => {
    startMonaco();
  }, []);

  // Register data-elb styles on mount
  useEffect(() => {
    registerDataElbStyles();
  }, []);

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

  // Apply external `code` changes imperatively while preserving the cursor and
  // scroll position. The editor is uncontrolled (defaultValue) so a normalised
  // round-trip from a controlled parent does not trigger @monaco-editor/react's
  // full-range replace (executeEdits with forceMoveMarkers:true), which would
  // shove the cursor to the document end while typing.
  useEffect(() => {
    const editor = editorRef.current;
    const model = editor?.getModel();
    if (!editor || !model) return;
    if (model.getValue() === code) return;

    const viewState = editor.saveViewState();
    model.pushEditOperations(
      [],
      [{ range: model.getFullModelRange(), text: code }],
      () => null,
    );
    if (viewState) editor.restoreViewState(viewState);
  }, [code]);

  const handleChange = (value: string | undefined) => {
    if (onChange && value !== undefined) {
      onChange(value);
    }
  };

  const handleBeforeMount = async (monaco: typeof import('monaco-editor')) => {
    monacoRef.current = monaco;

    // This hook runs right before the editor is created, so the shared setup
    // is in place for it even if the shared start has not settled yet.
    prepareMonaco(monaco);

    // Initialize JSON schema registry with this monaco instance
    initMonacoJson(monaco);

    // Always run built-in setup
    registerTheme(monaco);
    registerFormatters(monaco);

    if (packages && packages.length > 0) {
      registerWalkerOSTypes(monaco);

      const { loadPackageTypes } = await import('../../utils/monaco-types');
      for (const pkg of packages) {
        if (pkg !== '@walkeros/core') {
          await loadPackageTypes(monaco, { package: pkg }).catch(() => {});
        }
      }
    }

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
    defaultValue: string;
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

  // Code is a dark island in both page themes: the root carries the theme, so
  // the editor needs no ancestor to set it.
  return (
    <div className={codeClassName} ref={containerRef} data-theme="dark">
      <MonacoEditor
        height={monacoHeight}
        language={language}
        defaultValue={code}
        onChange={handleChange}
        beforeMount={handleBeforeMount}
        onMount={handleEditorMount}
        theme={ELB_THEME_DARK}
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
            alwaysConsumeMouseWheel: isolateScroll,
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
              ? { strings: true, other: false, comments: false }
              : false,
          stickyScroll: { enabled: sticky },
        }}
      />
    </div>
  );
}
