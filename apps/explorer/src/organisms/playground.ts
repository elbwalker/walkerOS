/**
 * Playground Organism
 * Clean demonstration of browser source event capture
 */

// Removed createColumns import - using CSS Grid instead
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

  // Create simple responsive grid layout
  const layout = createElement('div', {
    class: 'elb-responsive-grid elb-playground-grid',
  });
  container.appendChild(layout);

  // UI components
  let htmlEditor: any;
  let previewContainer: HTMLElement;
  let eventsDisplay: any;
  let highlightContainerElement: HTMLElement;
  let previewContentElement: HTMLElement;

  // Browser source management
  let currentBrowserSource: any = null;

  // Track last rendered content to avoid unnecessary re-renders
  let lastRenderedContent: CodeContent | null = null;

  // Events history management
  let capturedEvents: any[] = [];
  let selectedEventIndex: number = -1;
  let eventsListContainer: HTMLElement;

  // Highlight state for preview
  const highlights = {
    context: false,
    entity: false,
    property: false,
    action: false,
  };

  // Toggle highlight function
  function toggleHighlight(type: keyof typeof highlights) {
    highlights[type] = !highlights[type];
    updateHighlightClasses();

    // Update button states
    const button = document.querySelector(
      `[data-highlight="${type}"]`,
    ) as HTMLElement;
    if (button) {
      button.classList.toggle('active', highlights[type]);
    }
  }

  // Update highlight classes on preview content
  function updateHighlightClasses() {
    if (!previewContentElement) return;

    // Remove all highlight classes
    previewContentElement.classList.remove(
      'highlight-context',
      'highlight-entity',
      'highlight-property',
      'highlight-action',
    );

    // Add active highlight classes
    Object.entries(highlights).forEach(([key, active]) => {
      if (active) {
        previewContentElement.classList.add(`highlight-${key}`);
      }
    });
  }

  // Add event to the history
  function addCapturedEvent(eventData: any) {
    capturedEvents.push(eventData);
    selectedEventIndex = capturedEvents.length - 1; // Auto-select newest event
    updateEventsList();
    updateEventsDisplay();
  }

  // Update the events list in the footer
  function updateEventsList() {
    if (!eventsListContainer) return;

    // Clear existing buttons
    eventsListContainer.innerHTML = '';

    // Display events in reverse order (newest first)
    capturedEvents
      .slice()
      .reverse()
      .forEach((event, reversedIndex) => {
        const actualIndex = capturedEvents.length - 1 - reversedIndex;
        const button = createElement('button', {
          class: `elb-event-btn ${actualIndex === selectedEventIndex ? 'active' : ''}`,
          'data-event-index': actualIndex.toString(),
        });

        // Create event label
        const eventName = event.event || 'unknown';
        const eventLabel = createElement(
          'span',
          {
            class: 'elb-event-label',
          },
          eventName,
        );

        const eventIndex = createElement(
          'span',
          {
            class: 'elb-event-index',
          },
          (actualIndex + 1).toString(),
        );

        button.appendChild(eventLabel);
        button.appendChild(eventIndex);

        button.addEventListener('click', () => selectEvent(actualIndex));
        eventsListContainer.appendChild(button);
      });
  }

  // Select and display a specific event
  function selectEvent(index: number) {
    if (index < 0 || index >= capturedEvents.length) return;

    selectedEventIndex = index;
    updateEventsList(); // Update active states
    updateEventsDisplay();
  }

  // Update the main events display content
  function updateEventsDisplay() {
    if (!eventsDisplay) return;

    if (capturedEvents.length === 0) {
      eventsDisplay.setValue('// No events captured yet');
      return;
    }

    if (selectedEventIndex >= 0 && selectedEventIndex < capturedEvents.length) {
      const selectedEvent = capturedEvents[selectedEventIndex];
      eventsDisplay.setValue(JSON.stringify(selectedEvent, null, 2));
    }
  }

  // Get highlight styles as string for injection into shadow DOM
  function getHighlightStyles(): string {
    return `
      /* Highlight Colors */
      :host {
        --highlight-context: #ffbd44cc;
        --highlight-entity: #00ca4ecc;
        --highlight-property: #ff605ccc;
        --highlight-action: #9900ffcc;
      }

      /* Single highlight styles using box-shadow */
      .highlight-context [data-elbcontext] {
        box-shadow: 0 0 0 2px var(--highlight-context);
      }

      .highlight-entity [data-elb] {
        box-shadow: 0 0 0 2px var(--highlight-entity);
      }

      .highlight-property [data-elbproperty] {
        box-shadow: 0 0 0 2px var(--highlight-property);
      }

      .highlight-action [data-elbaction] {
        box-shadow: 0 0 0 2px var(--highlight-action);
      }

      /* Double combinations with layered box-shadows */
      .highlight-entity.highlight-action [data-elb][data-elbaction] {
        box-shadow:
          0 0 0 2px var(--highlight-action),
          0 0 0 4px var(--highlight-entity);
      }

      .highlight-entity.highlight-context [data-elb][data-elbcontext] {
        box-shadow:
          0 0 0 2px var(--highlight-entity),
          0 0 0 4px var(--highlight-context);
      }

      .highlight-entity.highlight-property [data-elb][data-elbproperty] {
        box-shadow:
          0 0 0 2px var(--highlight-entity),
          0 0 0 4px var(--highlight-property);
      }

      .highlight-action.highlight-context [data-elbaction][data-elbcontext] {
        box-shadow:
          0 0 0 2px var(--highlight-action),
          0 0 0 4px var(--highlight-context);
      }

      .highlight-context.highlight-property [data-elbcontext][data-elbproperty] {
        box-shadow:
          0 0 0 2px var(--highlight-context),
          0 0 0 4px var(--highlight-property);
      }

      .highlight-action.highlight-property [data-elbaction][data-elbproperty] {
        box-shadow:
          0 0 0 2px var(--highlight-action),
          0 0 0 4px var(--highlight-property);
      }

      /* Triple combinations with distinct layers */
      .highlight-entity.highlight-action.highlight-context [data-elb][data-elbaction][data-elbcontext] {
        box-shadow:
          0 0 0 2px var(--highlight-action),
          0 0 0 4px var(--highlight-entity),
          0 0 0 6px var(--highlight-context);
      }

      .highlight-entity.highlight-action.highlight-property [data-elb][data-elbaction][data-elbproperty] {
        box-shadow:
          0 0 0 2px var(--highlight-action),
          0 0 0 4px var(--highlight-entity),
          0 0 0 6px var(--highlight-property);
      }

      .highlight-entity.highlight-context.highlight-property [data-elb][data-elbcontext][data-elbproperty] {
        box-shadow:
          0 0 0 2px var(--highlight-context),
          0 0 0 4px var(--highlight-entity),
          0 0 0 6px var(--highlight-property);
      }

      .highlight-action.highlight-context.highlight-property [data-elbaction][data-elbcontext][data-elbproperty] {
        box-shadow:
          0 0 0 2px var(--highlight-action),
          0 0 0 4px var(--highlight-context),
          0 0 0 6px var(--highlight-property);
      }

      /* Quadruple combination */
      .highlight-entity.highlight-action.highlight-context.highlight-property [data-elb][data-elbaction][data-elbcontext][data-elbproperty] {
        box-shadow:
          0 0 0 2px var(--highlight-action),
          0 0 0 4px var(--highlight-entity),
          0 0 0 6px var(--highlight-context),
          0 0 0 8px var(--highlight-property);
      }
    `;
  }

  // Initialize components
  function initialize() {
    // HTML/CSS/JS Editor
    const codeColumn = createElement('div', { class: 'elb-playground-column' });
    layout.appendChild(codeColumn);

    htmlEditor = createCodeBox(codeColumn, {
      label: 'Code Editor',
      tabs: {
        enabled: true,
        items: ['html', 'css', 'js'],
        active: 'html',
      },
      lineNumbers: true,
      showControls: true,
      showReset: true,
      onTabChange: debounce((_tab, content) => handleCodeChange(content), 300),
    });
    htmlEditor.getContainer().setAttribute('data-testid', 'code-editor');

    // Initialize with example content
    const initialContent = {
      html: options.initialHTML || HTMLNode.getExampleHTML(),
      css: options.initialCSS || HTMLNode.getExampleCSS(),
      js: options.initialJS || HTMLNode.getExampleJS(),
    };
    htmlEditor.setAllValues(initialContent);

    // Preview
    const previewColumn = createElement('div', {
      class: 'elb-playground-column',
    });
    layout.appendChild(previewColumn);

    // Create highlight toggle buttons
    const highlightButtonsContainer = createElement('div', {
      class: 'elb-highlight-buttons',
    });

    const highlightTypes = [
      { key: 'context', label: 'Context' },
      { key: 'entity', label: 'Entity' },
      { key: 'property', label: 'Property' },
      { key: 'action', label: 'Action' },
    ] as const;

    highlightTypes.forEach(({ key, label }) => {
      const button = createElement(
        'button',
        {
          class: `elb-highlight-btn elb-highlight-btn--${key}`,
          'data-highlight': key,
        },
        label,
      );

      button.addEventListener('click', () => toggleHighlight(key));
      highlightButtonsContainer.appendChild(button);
    });

    const previewBox = createBox(previewColumn, {
      label: 'Live Preview',
      showHeader: true,
      noPadding: true,
      footerContent: highlightButtonsContainer,
    });
    previewBox.getContainer().setAttribute('data-testid', 'preview-panel');

    // Create highlight wrapper structure (similar to website)
    const highlightWrapper = createElement('div', {
      class: 'elb-highlight',
    });

    const highlightContainer = createElement('div', {
      class: 'highlight-container',
    });

    previewContainer = createElement('div', {
      class: 'preview-container',
    });
    previewContainer.setAttribute('data-testid', 'preview-container');

    // Build the hierarchy: content > highlightWrapper > highlightContainer > previewContainer
    highlightContainer.appendChild(previewContainer);
    highlightWrapper.appendChild(highlightContainer);
    previewBox.getContent().appendChild(highlightWrapper);

    // Store reference to highlight container for class updates
    highlightContainerElement = highlightContainer;

    // Captured Events Display
    const eventsColumn = createElement('div', {
      class: 'elb-playground-column',
    });
    layout.appendChild(eventsColumn);

    // Create events list container for footer
    eventsListContainer = createElement('div', {
      class: 'elb-events-list',
    });

    eventsDisplay = createCodeBox(eventsColumn, {
      label: 'Captured Events',
      value: '// No events captured yet',
      language: 'json',
      readOnly: true,
      lineNumbers: false,
      showControls: true,
      showReset: true,
      footerContent: eventsListContainer,
      onReset: () => {
        // Clear captured events history
        capturedEvents = [];
        selectedEventIndex = -1;
        updateEventsList();
        updateEventsDisplay();
      },
    });
    eventsDisplay.getContainer().setAttribute('data-testid', 'events-panel');

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

    // Inject highlight styles into shadow DOM
    const highlightStyles = createElement('style', {}, getHighlightStyles());
    previewShadow.appendChild(highlightStyles);

    // Set HTML content in a temporary container first to process it
    const tempContainer = createElement('div');
    tempContainer.innerHTML = content.html;

    // Mark property attributes for highlighting (similar to website preview)
    const entities = Array.from(tempContainer.querySelectorAll('[data-elb]'))
      .map((el) => el.getAttribute('data-elb'))
      .filter((entity): entity is string => !!entity);

    entities.forEach((entity) => {
      tempContainer.querySelectorAll(`[data-elb-${entity}]`).forEach((el) => {
        el.setAttribute('data-elbproperty', '');
      });
    });

    // Now set the processed HTML to the actual preview content
    previewContent.innerHTML = tempContainer.innerHTML;

    // Store reference to preview content and apply current highlight classes
    previewContentElement = previewContent;
    updateHighlightClasses();

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

          // Add to events history instead of overriding
          addCapturedEvent(capturedOutput);

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
   * Compare two code content objects for changes
   */
  function hasContentChanged(
    newContent: CodeContent,
    oldContent: CodeContent | null,
  ): boolean {
    if (!oldContent) return true;

    return (
      newContent.html !== oldContent.html ||
      newContent.css !== oldContent.css ||
      newContent.js !== oldContent.js
    );
  }

  /**
   * Handle code changes - only re-render if content actually changed
   */
  async function handleCodeChange(content: CodeContent): Promise<void> {
    if (hasContentChanged(content, lastRenderedContent)) {
      lastRenderedContent = { ...content };
      await renderPreview(content);
    }
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
      background: var(--elb-bg);
      font-family: var(--elb-font-sans);
    }
    
    .elb-playground-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1rem;
      flex: 1;
      padding: 1rem;
      min-height: 0;
    }
    
    .elb-playground-column {
      display: flex;
      flex-direction: column;
      min-height: 400px;
    }
    
    .preview-container {
      width: 100%;
      height: 100%;
      overflow: auto;
      background: var(--elb-surface);
      border-radius: var(--elb-radius-sm);
    }
    
    .elb-code-box {
      flex: 1;
      height: 100%;
    }
    
    .elb-box {
      flex: 1;
      height: 100%;
    }
    
    /* Responsive breakpoints */
    @media (max-width: 1024px) {
      .elb-playground-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }
    
    @media (max-width: 768px) {
      .elb-playground-grid {
        grid-template-columns: 1fr;
      }
    }
  `;
}
