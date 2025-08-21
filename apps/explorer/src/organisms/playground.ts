/**
 * Playground Organism
 * Clean demonstration of browser source event capture
 */

import { createColumns } from '../layouts/columns';
import { createCodeBox } from '../molecules/codeBox';
import { createBox } from '../atoms/box';
import { createElement, createShadow } from '../lib/dom';
import { HTMLNode } from '../nodes/html';
import type { CodeContent } from '../graph/types';
import { debounce } from '../lib/debounce';
import { sourceBrowser } from '@walkeros/web-source-browser';

export interface PlaygroundOptions {
  height?: string;
  initialHTML?: string;
  initialCSS?: string;
  initialJS?: string;
}

export interface PlaygroundAPI {
  setHTML: (html: string) => void;
  setCSS: (css: string) => void;
  setJS: (js: string) => void;
  setAllCode: (content: CodeContent) => void;
  destroy: () => void;
}

/**
 * Create a playground component
 */
export function createPlayground(
  element: HTMLElement,
  options: PlaygroundOptions = {},
): PlaygroundAPI {
  // Create shadow DOM for isolation
  const { shadow, container } = createShadow(element);

  // Apply styles
  const styles = createElement('style', {}, getPlaygroundStyles());
  shadow.appendChild(styles);

  // Create layout with three columns: HTML Editor, Preview, Captured Events
  const layout = createColumns(container, {
    columns: [
      { width: '33%', minWidth: '300px' }, // HTML Editor
      { width: '33%', minWidth: '300px' }, // Preview
      { width: '34%', minWidth: '300px' }, // Captured Events
    ],
    direction: 'horizontal',
    responsive: true,
    gap: 'var(--elb-spacing-md, 16px)',
  });

  // UI components
  let htmlEditor: any;
  let previewContainer: HTMLElement;
  let eventsDisplay: any;

  // Browser source management
  let currentBrowserSource: any = null;

  // Initialize components
  function initialize() {
    // HTML/CSS/JS Editor
    const codeBox = createBox(layout.getColumn(0), {
      label: 'Code Editor',
      showHeader: true,
    });
    codeBox.getContainer().setAttribute('data-testid', 'code-editor');

    htmlEditor = createCodeBox(codeBox.getContent(), {
      label: ' ', // Single space - creates header for tabs without visible duplicate text
      tabs: {
        enabled: true,
        items: ['html', 'css', 'js'],
        active: 'html',
      },
      lineNumbers: true,
      showControls: true,
      onTabChange: debounce((_tab, content) => handleCodeChange(content), 300),
    });

    // Initialize with example content
    const initialContent = {
      html: options.initialHTML || HTMLNode.getExampleHTML(),
      css: options.initialCSS || HTMLNode.getExampleCSS(),
      js: options.initialJS || HTMLNode.getExampleJS(),
    };
    htmlEditor.setAllValues(initialContent);

    // Preview
    const previewBox = createBox(layout.getColumn(1), {
      label: 'Live Preview',
      showHeader: true,
    });
    previewBox.getContainer().setAttribute('data-testid', 'preview-panel');

    previewContainer = createElement('div', {
      class: 'preview-container',
    });
    previewContainer.setAttribute('data-testid', 'preview-container');
    previewBox.getContent().appendChild(previewContainer);

    // Captured Events Display
    const eventsBox = createBox(layout.getColumn(2), {
      label: 'Captured Events',
      showHeader: true,
    });
    eventsBox.getContainer().setAttribute('data-testid', 'events-panel');

    eventsDisplay = createCodeBox(eventsBox.getContent(), {
      label: '',
      value: '// No events captured yet',
      language: 'json',
      readOnly: true,
      lineNumbers: false,
    });
    eventsDisplay.getContainer().setAttribute('data-testid', 'events-display');

    // Initial render
    renderPreview(initialContent);
  }

  /**
   * Render HTML/CSS/JS content in preview and initialize browser source
   */
  async function renderPreview(content: CodeContent): Promise<void> {
    // Clear previous content and browser source
    if (currentBrowserSource?.destroy) {
      currentBrowserSource.destroy();
      currentBrowserSource = null;
    }

    // Clear events display
    eventsDisplay.setValue('// No events captured yet');

    // Create preview shadow DOM
    previewContainer.innerHTML = '';
    const previewElement = createElement('div', {
      style: 'width: 100%; height: 100%; position: relative;',
    });
    const { shadow: previewShadow, container: previewContent } =
      createShadow(previewElement);
    previewContainer.appendChild(previewElement);

    // Apply CSS to preview shadow DOM
    if (content.css.trim()) {
      const styleElement = createElement('style', {}, content.css);
      previewShadow.appendChild(styleElement);
    }

    // Set HTML content
    previewContent.innerHTML = content.html;

    // Execute JavaScript if provided
    if (content.js.trim()) {
      try {
        const script = createElement('script', {}, content.js);
        previewShadow.appendChild(script);
      } catch (error) {
        console.error('Error executing JavaScript:', error);
      }
    }

    // Initialize browser source with the preview content
    await initializeBrowserSource(previewContent);
  }

  /**
   * Initialize browser source with minimal collector for event capture
   */
  async function initializeBrowserSource(
    container: HTMLElement,
  ): Promise<void> {
    try {
      console.debug('Initializing browser source with container:', container);

      // Create minimal collector instance that just captures events for display
      const minimalCollector = {
        push: async (...args: any[]) => {
          // Handle different overloads of the push function
          let event: string;
          let data: any = {};

          if (args.length === 1) {
            // Single argument - could be string or partial event
            if (typeof args[0] === 'string') {
              event = args[0];
            } else {
              // Partial event object
              event = args[0].event || 'unknown';
              data = args[0].data || {};
            }
          } else if (args.length >= 2) {
            // Multiple arguments
            event = args[0] as string;
            data = args[1] || {};
          } else {
            event = 'unknown';
          }

          // Skip internal walker commands - don't display them
          if (event.startsWith('walker ')) {
            return {
              ok: true,
              successful: [],
              queued: [],
              failed: [],
            };
          }

          // Capture exactly what browser source sends
          const capturedOutput = {
            event,
            data,
            timestamp: Date.now(),
          };

          console.debug('Browser source output:', capturedOutput);

          // Override events display (don't accumulate)
          eventsDisplay.setValue(JSON.stringify([capturedOutput], null, 2));

          // Return success result matching PushResult interface
          return {
            ok: true,
            successful: [],
            queued: [],
            failed: [],
          };
        },
        // Required collector properties (minimal implementation)
        allowed: true,
        config: {
          dryRun: false,
          tagging: 1,
          globalsStatic: false,
          sessionStatic: false,
          verbose: false,
        },
        consent: {},
        count: 0,
        custom: {},
        sources: {},
        destinations: {},
        globals: {},
        group: 'demo',
        hooks: {},
        on: {},
        queue: [],
        round: 0,
        session: undefined,
        timing: Date.now(),
        user: {},
        version: '2.0.0',
      };

      // Initialize browser source (cast to bypass strict typing for this minimal demo)
      const result = await sourceBrowser(minimalCollector as any, {
        type: 'browser',
        settings: {
          scope: container,
          pageview: false, // Don't auto-send pageviews
          session: false, // Don't track sessions
          prefix: 'data-elb',
          elb: '', // Don't create global elb function
          elbLayer: false, // Don't use elbLayer
        },
      });

      currentBrowserSource = result.source;
      console.debug('Browser source initialized successfully');

      // Trigger initial scan
      await minimalCollector.push('walker run');
    } catch (error) {
      console.error('Failed to initialize browser source:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      eventsDisplay.setValue(
        '// Error initializing browser source: ' + errorMessage,
      );
    }
  }

  /**
   * Handle code changes
   */
  async function handleCodeChange(content: CodeContent): Promise<void> {
    await renderPreview(content);
  }

  // Initialize
  initialize();

  // Set height if provided
  if (options.height) {
    container.style.height = options.height;
  }

  // API
  return {
    setHTML: (html: string) => {
      const currentValues = htmlEditor.getAllValues();
      const newContent = { ...currentValues, html };
      htmlEditor.setAllValues(newContent);
      handleCodeChange(newContent);
    },

    setCSS: (css: string) => {
      const currentValues = htmlEditor.getAllValues();
      const newContent = { ...currentValues, css };
      htmlEditor.setAllValues(newContent);
      handleCodeChange(newContent);
    },

    setJS: (js: string) => {
      const currentValues = htmlEditor.getAllValues();
      const newContent = { ...currentValues, js };
      htmlEditor.setAllValues(newContent);
      handleCodeChange(newContent);
    },

    setAllCode: (content: CodeContent) => {
      htmlEditor.setAllValues(content);
      handleCodeChange(content);
    },

    destroy: () => {
      // Cleanup browser source
      if (currentBrowserSource?.destroy) {
        currentBrowserSource.destroy();
      }

      layout.destroy();
      shadow.innerHTML = '';
    },
  };
}

/**
 * Get playground styles
 */
function getPlaygroundStyles(): string {
  return `
    :host {
      display: block;
      width: 100%;
      height: 100%;
    }
    
    .elb-explorer-root {
      display: flex;
      flex-direction: column;
      height: 100%;
      background: var(--elb-bg-primary, #ffffff);
      font-family: var(--elb-font-family, system-ui, -apple-system, sans-serif);
    }
    
    .preview-container {
      width: 100%;
      height: 100%;
      overflow: auto;
      background: var(--elb-bg-secondary, #f9fafb);
      border: 1px solid var(--elb-border-color, #e5e7eb);
      border-radius: var(--elb-border-radius, 4px);
    }
    
    .elb-layout {
      flex: 1;
      min-height: 0;
    }
    
    .elb-layout-column {
      display: flex;
      flex-direction: column;
      min-height: 400px;
    }
    
    .elb-box {
      flex: 1;
      display: flex;
      flex-direction: column;
    }
    
    .elb-code-box {
      flex: 1;
    }
    
    /* Responsive */
    @media (max-width: 1024px) {
      .elb-layout--horizontal {
        flex-direction: column !important;
      }
      
      .elb-layout-column {
        width: 100% !important;
        min-width: 0 !important;
        margin-bottom: var(--elb-spacing-md, 16px);
      }
    }
  `;
}
