/**
 * LiveCode Component - Live HTML/CSS/JS editor with real-time preview
 *
 * Features:
 * - Combined code editor and preview
 * - Real-time updates as you type
 * - Multiple editor tabs (HTML, CSS, JS)
 * - Responsive layout options
 * - Error handling and debugging
 * - walkerOS integration ready
 */

import { createComponent, type ComponentAPI } from '../core/Component';
import { createCodeEditor, type CodeEditorAPI } from './CodeEditor';
import { createPreview, type PreviewAPI } from './Preview';
import { createResultDisplay, type ResultDisplayAPI } from './ResultDisplay';
import { createElement, addEventListener, injectCSS } from '../utils/dom';
import { debounce } from '../utils/debounce';
import { eventBus } from '../core/EventBus';

export interface LiveCodeOptions {
  layout?: 'horizontal' | 'vertical' | 'tabs';
  showTabs?: boolean;
  showResults?: boolean;
  autoRun?: boolean;
  runDelay?: number;
  initialHTML?: string;
  initialCSS?: string;
  initialJS?: string;
  editorHeight?: string;
  previewHeight?: string;
  enableConsoleCapture?: boolean;
  onRun?: (code: { html: string; css: string; js: string }) => void;
  onError?: (error: string) => void;
}

export interface LiveCodeAPI extends ComponentAPI {
  getHTML(): string;
  getCSS(): string;
  getJS(): string;
  setHTML(html: string): void;
  setCSS(css: string): void;
  setJS(js: string): void;
  run(): void;
  clear(): void;
  setLayout(layout: 'horizontal' | 'vertical' | 'tabs'): void;
  getActiveEditor(): CodeEditorAPI | null;
  getPreview(): PreviewAPI;
  getResults(): ResultDisplayAPI | null;
}

type EditorTab = 'html' | 'css' | 'js';

/**
 * Create a LiveCode component
 */
export function createLiveCode(
  elementOrSelector: HTMLElement | string,
  options: LiveCodeOptions = {},
): LiveCodeAPI {
  const baseComponent = createComponent(elementOrSelector, {
    autoMount: false,
  });

  const element = baseComponent.getElement()!;
  element.classList.add('explorer-livecode');

  // Component state
  let currentLayout = options.layout || 'horizontal';
  let activeTab: EditorTab = 'html';
  let htmlEditor: CodeEditorAPI;
  let cssEditor: CodeEditorAPI;
  let jsEditor: CodeEditorAPI;
  let preview: PreviewAPI;
  let results: ResultDisplayAPI | null = null;

  // State
  let htmlContent =
    options.initialHTML ||
    '<div class="demo">\n  <h1>Hello, LiveCode!</h1>\n  <p>Edit the HTML, CSS, and JS to see live updates.</p>\n</div>';
  let cssContent =
    options.initialCSS ||
    '.demo {\n  padding: 20px;\n  text-align: center;\n  background: linear-gradient(45deg, #3b82f6, #10b981);\n  color: white;\n  border-radius: 8px;\n}\n\n.demo h1 {\n  margin: 0 0 10px 0;\n  font-size: 24px;\n}\n\n.demo p {\n  margin: 0;\n  opacity: 0.9;\n}';
  let jsContent =
    options.initialJS ||
    '// JavaScript code\nconsole.log("LiveCode component loaded!");\n\n// Example: Add click handler\ndocument.addEventListener("DOMContentLoaded", () => {\n  const demo = document.querySelector(".demo");\n  if (demo) {\n    demo.addEventListener("click", () => {\n      alert("Hello from LiveCode!");\n    });\n  }\n});';

  // Cleanup functions
  const cleanupFunctions: Array<() => void> = [];

  // Debounced update for performance
  const debouncedUpdate = debounce(() => {
    if (options.autoRun !== false) {
      updatePreview();
    }
  }, options.runDelay || 500);

  /**
   * Inject LiveCode CSS styles
   */
  function injectStyles(): void {
    const css = `
/* LiveCode Component Styles */
.explorer-livecode {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--explorer-bg-primary);
  border: 1px solid var(--explorer-border-primary);
  border-radius: 8px;
  overflow: hidden;
}

.explorer-livecode__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: var(--explorer-bg-secondary);
  border-bottom: 1px solid var(--explorer-border-primary);
  font-size: 12px;
  color: var(--explorer-text-secondary);
}

.explorer-livecode__title {
  font-weight: 600;
  color: var(--explorer-text-primary);
}

.explorer-livecode__actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.explorer-livecode__run-btn {
  background: var(--explorer-interactive-success);
  color: var(--explorer-text-inverse);
  border: none;
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.explorer-livecode__run-btn:hover {
  background: var(--explorer-interactive-primary);
}

.explorer-livecode__clear-btn {
  background: none;
  border: 1px solid var(--explorer-border-secondary);
  color: var(--explorer-text-secondary);
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.explorer-livecode__clear-btn:hover {
  background: var(--explorer-interactive-hover);
  color: var(--explorer-text-primary);
}

.explorer-livecode__layout-toggle {
  background: none;
  border: none;
  color: var(--explorer-text-secondary);
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  font-size: 16px;
  transition: all 0.2s ease;
}

.explorer-livecode__layout-toggle:hover {
  background: var(--explorer-interactive-hover);
  color: var(--explorer-text-primary);
}

.explorer-livecode__content {
  flex: 1;
  display: flex;
  overflow: hidden;
}

/* Horizontal Layout */
.explorer-livecode--horizontal .explorer-livecode__content {
  flex-direction: row;
}

.explorer-livecode--horizontal .explorer-livecode__editors {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.explorer-livecode--horizontal .explorer-livecode__preview-section {
  flex: 1;
  border-left: 1px solid var(--explorer-border-primary);
}

/* Vertical Layout */
.explorer-livecode--vertical .explorer-livecode__content {
  flex-direction: column;
}

.explorer-livecode--vertical .explorer-livecode__editors {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.explorer-livecode--vertical .explorer-livecode__preview-section {
  flex: 1;
  border-top: 1px solid var(--explorer-border-primary);
}

/* Tabs Layout */
.explorer-livecode--tabs .explorer-livecode__content {
  flex-direction: column;
}

.explorer-livecode--tabs .explorer-livecode__editors {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.explorer-livecode--tabs .explorer-livecode__preview-section {
  display: none;
}

.explorer-livecode--tabs.preview-mode .explorer-livecode__editors {
  display: none;
}

.explorer-livecode--tabs.preview-mode .explorer-livecode__preview-section {
  display: flex;
  flex: 1;
}

.explorer-livecode__editor-tabs {
  display: flex;
  background: var(--explorer-bg-tertiary);
  border-bottom: 1px solid var(--explorer-border-primary);
}

.explorer-livecode__tab {
  background: none;
  border: none;
  padding: 8px 16px;
  font-size: 12px;
  font-weight: 500;
  color: var(--explorer-text-secondary);
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all 0.2s ease;
}

.explorer-livecode__tab:hover {
  background: var(--explorer-interactive-hover);
  color: var(--explorer-text-primary);
}

.explorer-livecode__tab--active {
  color: var(--explorer-interactive-primary);
  border-bottom-color: var(--explorer-interactive-primary);
  background: var(--explorer-bg-primary);
}

.explorer-livecode__tab--preview {
  margin-left: auto;
  border-left: 1px solid var(--explorer-border-primary);
}

.explorer-livecode__editor-container {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.explorer-livecode__editor {
  flex: 1;
  display: none;
}

.explorer-livecode__editor--active {
  display: flex;
}

.explorer-livecode__preview-section {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.explorer-livecode__preview {
  flex: 1;
}

.explorer-livecode__results {
  height: 200px;
  border-top: 1px solid var(--explorer-border-primary);
}

/* Responsive design */
@media (max-width: 768px) {
  .explorer-livecode--horizontal .explorer-livecode__content {
    flex-direction: column;
  }
  
  .explorer-livecode--horizontal .explorer-livecode__preview-section {
    border-left: none;
    border-top: 1px solid var(--explorer-border-primary);
  }
  
  .explorer-livecode__header {
    padding: 6px 8px;
  }
  
  .explorer-livecode__tab {
    padding: 6px 12px;
    font-size: 11px;
  }
}
`;

    injectCSS(css, 'explorer-livecode-styles');
  }

  /**
   * Create the DOM structure
   */
  function createDOM(): void {
    element.innerHTML = '';
    element.classList.add(`explorer-livecode--${currentLayout}`);

    // Create header
    const header = createElement('div', {
      className: 'explorer-livecode__header',
    });

    const title = createElement('div', {
      className: 'explorer-livecode__title',
      textContent: 'LiveCode Editor',
    });

    const actions = createElement('div', {
      className: 'explorer-livecode__actions',
    });

    // Layout toggle
    const layoutToggle = createElement('button', {
      className: 'explorer-livecode__layout-toggle',
      innerHTML: getLayoutIcon(currentLayout),
      title: 'Toggle layout',
    }) as HTMLButtonElement;

    // Run button
    const runBtn = createElement('button', {
      className: 'explorer-livecode__run-btn',
      textContent: 'Run',
    }) as HTMLButtonElement;

    // Clear button
    const clearBtn = createElement('button', {
      className: 'explorer-livecode__clear-btn',
      textContent: 'Clear',
    }) as HTMLButtonElement;

    actions.appendChild(layoutToggle);
    actions.appendChild(runBtn);
    actions.appendChild(clearBtn);

    header.appendChild(title);
    header.appendChild(actions);
    element.appendChild(header);

    // Create content container
    const content = createElement('div', {
      className: 'explorer-livecode__content',
    });

    // Create editors section
    const editorsSection = createElement('div', {
      className: 'explorer-livecode__editors',
    });

    // Create tabs if needed
    if (options.showTabs !== false) {
      const tabsContainer = createElement('div', {
        className: 'explorer-livecode__editor-tabs',
      });

      const htmlTab = createTab('html', 'HTML', activeTab === 'html');
      const cssTab = createTab('css', 'CSS', activeTab === 'css');
      const jsTab = createTab('js', 'JS', activeTab === 'js');

      tabsContainer.appendChild(htmlTab);
      tabsContainer.appendChild(cssTab);
      tabsContainer.appendChild(jsTab);

      // Preview tab for tabs layout
      if (currentLayout === 'tabs') {
        const previewTab = createElement('button', {
          className: 'explorer-livecode__tab explorer-livecode__tab--preview',
          textContent: 'Preview',
        }) as HTMLButtonElement;

        const onPreviewTab = () => {
          element.classList.toggle('preview-mode');
          previewTab.classList.toggle('explorer-livecode__tab--active');
        };
        cleanupFunctions.push(
          addEventListener(previewTab, 'click', onPreviewTab),
        );

        tabsContainer.appendChild(previewTab);
      }

      editorsSection.appendChild(tabsContainer);
    }

    // Create editor container
    const editorContainer = createElement('div', {
      className: 'explorer-livecode__editor-container',
    });

    // Create individual editors
    const htmlEditorEl = createElement('div', {
      className: `explorer-livecode__editor ${activeTab === 'html' ? 'explorer-livecode__editor--active' : ''}`,
    });
    const cssEditorEl = createElement('div', {
      className: `explorer-livecode__editor ${activeTab === 'css' ? 'explorer-livecode__editor--active' : ''}`,
    });
    const jsEditorEl = createElement('div', {
      className: `explorer-livecode__editor ${activeTab === 'js' ? 'explorer-livecode__editor--active' : ''}`,
    });

    editorContainer.appendChild(htmlEditorEl);
    editorContainer.appendChild(cssEditorEl);
    editorContainer.appendChild(jsEditorEl);

    editorsSection.appendChild(editorContainer);
    content.appendChild(editorsSection);

    // Create preview section
    const previewSection = createElement('div', {
      className: 'explorer-livecode__preview-section',
    });

    const previewEl = createElement('div', {
      className: 'explorer-livecode__preview',
    });
    previewSection.appendChild(previewEl);

    // Add results if enabled
    if (options.showResults !== false) {
      const resultsEl = createElement('div', {
        className: 'explorer-livecode__results',
      });
      previewSection.appendChild(resultsEl);

      // Create results component
      results = createResultDisplay(resultsEl, {
        showCopyButton: true,
        showTimestamps: false,
        maxResults: 50,
        autoScroll: true,
      });
    }

    content.appendChild(previewSection);
    element.appendChild(content);

    // Initialize editors
    htmlEditor = createCodeEditor(htmlEditorEl, {
      language: 'html',
      value: htmlContent,
      height: options.editorHeight || '100%',
      onChange: (value) => {
        htmlContent = value;
        debouncedUpdate();
      },
    });

    cssEditor = createCodeEditor(cssEditorEl, {
      language: 'css',
      value: cssContent,
      height: options.editorHeight || '100%',
      onChange: (value) => {
        cssContent = value;
        debouncedUpdate();
      },
    });

    jsEditor = createCodeEditor(jsEditorEl, {
      language: 'javascript',
      value: jsContent,
      height: options.editorHeight || '100%',
      onChange: (value) => {
        jsContent = value;
        debouncedUpdate();
      },
    });

    // Initialize preview
    preview = createPreview(previewEl, {
      height: options.previewHeight || '100%',
      onError: (error) => {
        results?.addError(error, 'Preview Error');
        options.onError?.(error);
      },
    });

    // Setup event listeners
    setupEventListeners(layoutToggle, runBtn, clearBtn);

    // Initial preview update
    updatePreview();
  }

  /**
   * Create a tab element
   */
  function createTab(
    tab: EditorTab,
    label: string,
    active: boolean,
  ): HTMLButtonElement {
    const tabEl = createElement('button', {
      className: `explorer-livecode__tab ${active ? 'explorer-livecode__tab--active' : ''}`,
      textContent: label,
    }) as HTMLButtonElement;

    const onTabClick = () => {
      switchTab(tab);
    };

    cleanupFunctions.push(addEventListener(tabEl, 'click', onTabClick));

    return tabEl;
  }

  /**
   * Switch active tab
   */
  function switchTab(tab: EditorTab): void {
    activeTab = tab;

    // Update tab states
    const tabs = element.querySelectorAll(
      '.explorer-livecode__tab:not(.explorer-livecode__tab--preview)',
    );
    tabs.forEach((tabEl, index) => {
      const isActive = ['html', 'css', 'js'][index] === tab;
      tabEl.classList.toggle('explorer-livecode__tab--active', isActive);
    });

    // Update editor visibility
    const editors = element.querySelectorAll('.explorer-livecode__editor');
    editors.forEach((editorEl, index) => {
      const isActive = ['html', 'css', 'js'][index] === tab;
      editorEl.classList.toggle('explorer-livecode__editor--active', isActive);
    });

    // Focus the active editor
    const activeEditor = api.getActiveEditor();
    if (activeEditor) {
      activeEditor.focus();
    }
  }

  /**
   * Get layout icon
   */
  function getLayoutIcon(layout: string): string {
    switch (layout) {
      case 'horizontal':
        return '⟷';
      case 'vertical':
        return '↕';
      case 'tabs':
        return '⧉';
      default:
        return '⟷';
    }
  }

  /**
   * Update preview with current code
   */
  function updatePreview(): void {
    if (!preview) return;

    // Capture console if enabled
    let consoleScript = '';
    if (options.enableConsoleCapture && results) {
      consoleScript = `
        <script>
          (function() {
            const originalLog = console.log;
            const originalError = console.error;
            const originalWarn = console.warn;
            
            console.log = function(...args) {
              parent.postMessage({
                type: 'console',
                level: 'log',
                args: args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg))
              }, '*');
              originalLog.apply(console, args);
            };
            
            console.error = function(...args) {
              parent.postMessage({
                type: 'console',
                level: 'error',
                args: args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg))
              }, '*');
              originalError.apply(console, args);
            };
            
            console.warn = function(...args) {
              parent.postMessage({
                type: 'console',
                level: 'warn',
                args: args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg))
              }, '*');
              originalWarn.apply(console, args);
            };
          })();
        </script>
      `;
    }

    const fullHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>LiveCode Preview</title>
  <style>
    body { 
      margin: 0; 
      padding: 16px; 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
    }
    ${cssContent}
  </style>
  ${consoleScript}
</head>
<body>
  ${htmlContent}
  <script>
    try {
      ${jsContent}
    } catch (error) {
      parent.postMessage({
        type: 'preview-error',
        message: error.message,
        stack: error.stack
      }, '*');
    }
  </script>
</body>
</html>`;

    preview.setHTML(fullHTML);

    // Emit run event
    eventBus.emit('livecode:run', {
      html: htmlContent,
      css: cssContent,
      js: jsContent,
    });

    options.onRun?.({ html: htmlContent, css: cssContent, js: jsContent });
  }

  /**
   * Setup event listeners
   */
  function setupEventListeners(
    layoutToggle: HTMLButtonElement,
    runBtn: HTMLButtonElement,
    clearBtn: HTMLButtonElement,
  ): void {
    // Layout toggle
    const onLayoutToggle = () => {
      const layouts: Array<'horizontal' | 'vertical' | 'tabs'> = [
        'horizontal',
        'vertical',
        'tabs',
      ];
      const currentIndex = layouts.indexOf(currentLayout);
      const nextLayout = layouts[(currentIndex + 1) % layouts.length];
      api.setLayout(nextLayout);
    };
    cleanupFunctions.push(
      addEventListener(layoutToggle, 'click', onLayoutToggle),
    );

    // Run button
    const onRun = () => {
      updatePreview();
      results?.addInfo('Code executed', 'LiveCode');
    };
    cleanupFunctions.push(addEventListener(runBtn, 'click', onRun));

    // Clear button
    const onClear = () => {
      htmlEditor.setValue('');
      cssEditor.setValue('');
      jsEditor.setValue('');
      results?.clear();
      htmlContent = '';
      cssContent = '';
      jsContent = '';
      updatePreview();
    };
    cleanupFunctions.push(addEventListener(clearBtn, 'click', onClear));

    // Console capture
    if (options.enableConsoleCapture && results) {
      const onMessage = (event: MessageEvent) => {
        if (event.data.type === 'console') {
          const message = event.data.args.join(' ');
          switch (event.data.level) {
            case 'log':
              results?.addLog(message, 'Console');
              break;
            case 'error':
              results?.addError(message, 'Console Error');
              break;
            case 'warn':
              results?.addWarning(message, 'Console Warning');
              break;
          }
        }
      };

      const messageHandler = addEventListener(
        window,
        'message' as keyof HTMLElementEventMap,
        onMessage as any,
      );
      cleanupFunctions.push(messageHandler);
    }
  }

  // Enhanced API
  const api: LiveCodeAPI = {
    ...baseComponent,

    getHTML(): string {
      return htmlContent;
    },

    getCSS(): string {
      return cssContent;
    },

    getJS(): string {
      return jsContent;
    },

    setHTML(html: string): void {
      htmlContent = html;
      htmlEditor.setValue(html);
      debouncedUpdate();
    },

    setCSS(css: string): void {
      cssContent = css;
      cssEditor.setValue(css);
      debouncedUpdate();
    },

    setJS(js: string): void {
      jsContent = js;
      jsEditor.setValue(js);
      debouncedUpdate();
    },

    run(): void {
      updatePreview();
    },

    clear(): void {
      this.setHTML('');
      this.setCSS('');
      this.setJS('');
      results?.clear();
    },

    setLayout(layout: 'horizontal' | 'vertical' | 'tabs'): void {
      currentLayout = layout;

      // Update element classes
      element.className = element.className.replace(
        /explorer-livecode--\w+/,
        '',
      );
      element.classList.add(`explorer-livecode--${layout}`);

      // Update layout icon
      const layoutToggle = element.querySelector(
        '.explorer-livecode__layout-toggle',
      );
      if (layoutToggle) {
        layoutToggle.innerHTML = getLayoutIcon(layout);
      }

      // Recreate DOM for tabs layout
      if (layout === 'tabs') {
        createDOM();
      }
    },

    getActiveEditor(): CodeEditorAPI | null {
      switch (activeTab) {
        case 'html':
          return htmlEditor;
        case 'css':
          return cssEditor;
        case 'js':
          return jsEditor;
        default:
          return null;
      }
    },

    getPreview(): PreviewAPI {
      return preview;
    },

    getResults(): ResultDisplayAPI | null {
      return results;
    },

    destroy(): void {
      cleanupFunctions.forEach((cleanup) => cleanup());
      cleanupFunctions.length = 0;

      htmlEditor?.destroy();
      cssEditor?.destroy();
      jsEditor?.destroy();
      preview?.destroy();
      results?.destroy();

      baseComponent.destroy();
    },
  };

  // Initialize component
  injectStyles();
  createDOM();

  // Mount the base component
  api.mount();

  return api;
}
