/**
 * Destination Component - Three-column layout for Event, Mapping, and Result
 *
 * Features:
 * - Three-column layout with Event, Mapping, and Result
 * - Two CodeEditor components for JSON input
 * - One ResultDisplay showing both values as an array
 * - Automatic update when either Event or Mapping changes
 * - Theme-aware styling with shadow DOM support
 */

import { type ComponentAPI } from '../core/Component';
import { createCodeEditor, type CodeEditorAPI } from './CodeEditor';
import { createResultDisplay, type ResultDisplayAPI } from './ResultDisplay';
import { debounce } from '../utils/debounce';
import { createElement } from '../utils/dom';

export interface DestinationOptions {
  height?: string;
  showHeader?: boolean;
  title?: string;
  initialEvent?: string;
  initialMapping?: string;
  updateDelay?: number;
}

export interface DestinationAPI extends ComponentAPI {
  getEventData(): string;
  setEventData(data: string): void;
  getMappingData(): string;
  setMappingData(data: string): void;
  getResults(): any[];
  refresh(): void;
  clear(): void;
}

const DESTINATION_CSS = `
  .destination-container {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 16px;
    height: 100%;
    min-height: 400px;
    width: 100%;
  }
  
  .destination-column {
    display: flex;
    flex-direction: column;
    min-height: 400px;
    overflow: hidden;
    background: white;
    border: 1px solid #e1e5e9;
    border-radius: 8px;
  }
  
  .column-header {
    padding: 12px 16px;
    background: #f8f9fa;
    border-bottom: 1px solid #e1e5e9;
    font-weight: 600;
    font-size: 14px;
    color: #333;
  }
  
  .column-content {
    flex: 1;
    min-height: 0;
    height: 100%;
    overflow: hidden;
  }
  
  @media (max-width: 1024px) {
    .destination-container {
      grid-template-columns: 1fr;
      gap: 12px;
    }
    
    .destination-column {
      min-height: 300px;
    }
  }
`;

/**
 * Create a Destination component
 */
export function createDestination(
  elementOrSelector: HTMLElement | string,
  options: DestinationOptions = {},
): DestinationAPI {
  // Component state
  let eventData =
    options.initialEvent ||
    `{
  "entity": "product",
  "action": "view",
  "data": {
    "id": "prod-123",
    "name": "Awesome Product",
    "price": 99.99,
    "category": "electronics"
  }
}`;

  let mappingData =
    options.initialMapping ||
    `{
  "event_name": "product_view",
  "product_id": "data.id",
  "product_name": "data.name",
  "product_price": "data.price",
  "product_category": "data.category"
}`;

  let eventEditor: CodeEditorAPI;
  let mappingEditor: CodeEditorAPI;
  let resultDisplay: ResultDisplayAPI;

  // Get the target element
  const element =
    typeof elementOrSelector === 'string'
      ? (document.querySelector(elementOrSelector) as HTMLElement)
      : elementOrSelector;

  if (!element) {
    throw new Error('Target element not found');
  }

  // Set basic styles on the element
  element.style.height = options.height || '100%';
  element.style.width = '100%';

  // Debounced update for performance
  const debouncedUpdate = debounce(() => {
    updateResults();
  }, options.updateDelay || 300);

  /**
   * Create the three-column layout
   */
  function createLayout(): void {
    // Clear any existing content
    element.innerHTML = '';

    // Inject basic CSS
    const style = createElement('style');
    style.textContent = DESTINATION_CSS;
    document.head.appendChild(style);

    // Create the container
    const container = createElement('div', {
      className: 'destination-container',
    });

    // Create Event column
    const eventColumn = createElement('div', {
      className: 'destination-column',
    });
    const eventHeader = createElement('div', { className: 'column-header' });
    eventHeader.textContent = 'Event';
    const eventContent = createElement('div', { className: 'column-content' });
    eventColumn.appendChild(eventHeader);
    eventColumn.appendChild(eventContent);

    // Create Mapping column
    const mappingColumn = createElement('div', {
      className: 'destination-column',
    });
    const mappingHeader = createElement('div', { className: 'column-header' });
    mappingHeader.textContent = 'Mapping';
    const mappingContent = createElement('div', {
      className: 'column-content',
    });
    mappingColumn.appendChild(mappingHeader);
    mappingColumn.appendChild(mappingContent);

    // Create Result column
    const resultColumn = createElement('div', {
      className: 'destination-column',
    });
    const resultHeader = createElement('div', { className: 'column-header' });
    resultHeader.textContent = 'Result';
    const resultContent = createElement('div', { className: 'column-content' });
    resultColumn.appendChild(resultHeader);
    resultColumn.appendChild(resultContent);

    // Assemble layout
    container.appendChild(eventColumn);
    container.appendChild(mappingColumn);
    container.appendChild(resultColumn);

    // Add to element
    element.appendChild(container);

    // Create components
    eventEditor = createCodeEditor(eventContent, {
      language: 'json',
      value: eventData,
      height: '100%',
      onChange: (value) => {
        eventData = value;
        debouncedUpdate();
      },
    });

    mappingEditor = createCodeEditor(mappingContent, {
      language: 'json',
      value: mappingData,
      height: '100%',
      onChange: (value) => {
        mappingData = value;
        debouncedUpdate();
      },
    });

    resultDisplay = createResultDisplay(resultContent, {
      height: '100%',
      showCopyButton: true,
      showTimestamps: false,
      maxResults: 1,
    });

    // Initial update
    updateResults();
  }

  /**
   * Update the result display with current data
   */
  function updateResults(): void {
    try {
      let parsedEvent: any;
      let parsedMapping: any;

      // Parse event data
      try {
        parsedEvent = eventData.trim() ? JSON.parse(eventData) : null;
      } catch (error) {
        parsedEvent = {
          error: 'Invalid JSON in Event',
          details: String(error),
        };
      }

      // Parse mapping data
      try {
        parsedMapping = mappingData.trim() ? JSON.parse(mappingData) : null;
      } catch (error) {
        parsedMapping = {
          error: 'Invalid JSON in Mapping',
          details: String(error),
        };
      }

      // Create result array
      const result = [parsedEvent, parsedMapping];

      // Clear and display result
      resultDisplay.clear();
      resultDisplay.addValue(result);
    } catch (error) {
      resultDisplay.clear();
      resultDisplay.addError(`Update error: ${String(error)}`);
    }
  }

  // Simple API
  const api: DestinationAPI = {
    id: 'dest-' + Date.now(),
    mount() {},
    unmount() {},
    destroy() {
      eventEditor?.destroy();
      mappingEditor?.destroy();
      resultDisplay?.destroy();
      element.innerHTML = '';
    },
    on() {
      return () => {};
    },
    emit() {},
    setTheme() {},
    getElement() {
      return element;
    },
    getShadowRoot() {
      return null;
    },
    getContentRoot() {
      return element;
    },
    injectThemeCSS() {},
    getCurrentTheme() {
      return 'light' as const;
    },

    getEventData(): string {
      return eventData;
    },

    setEventData(data: string): void {
      eventData = data;
      eventEditor?.setValue(data);
      debouncedUpdate();
    },

    getMappingData(): string {
      return mappingData;
    },

    setMappingData(data: string): void {
      mappingData = data;
      mappingEditor?.setValue(data);
      debouncedUpdate();
    },

    getResults(): any[] {
      return resultDisplay?.getResults() || [];
    },

    refresh(): void {
      updateResults();
    },

    clear(): void {
      eventData = '{}';
      mappingData = '{}';
      eventEditor?.setValue('{}');
      mappingEditor?.setValue('{}');
      resultDisplay?.clear();
    },
  };

  // Initialize component
  createLayout();

  return api;
}
