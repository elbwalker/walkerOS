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
import {
  createMultiColumnLayout,
  type MultiColumnLayoutAPI,
} from '../core/MultiColumnLayout';
import { createCodeEditor, type CodeEditorAPI } from './CodeEditor';
import { createResultDisplay, type ResultDisplayAPI } from './ResultDisplay';
import { debounce } from '../utils/debounce';

export interface DestinationOptions {
  height?: string;
  showHeader?: boolean;
  title?: string;
  initialEvent?: string;
  initialMapping?: string;
  updateDelay?: number;
}

export interface DestinationAPI extends MultiColumnLayoutAPI {
  getEventData(): string;
  setEventData(data: string): void;
  getMappingData(): string;
  setMappingData(data: string): void;
  getResults(): any[];
  refresh(): void;
  clear(): void;
}

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

  // Create multi-column layout with 3 columns
  const {
    api: baseApi,
    contentElement,
    columnContainers,
    cleanup,
  } = createMultiColumnLayout(elementOrSelector, {
    columns: [
      { title: 'Event', className: 'explorer-unified-container--code-editor' },
      {
        title: 'Mapping',
        className: 'explorer-unified-container--code-editor',
      },
      {
        title: 'Result',
        className: 'explorer-unified-container--result-display',
      },
    ],
    layout: 'horizontal',
    height: options.height,
    showHeader: options.showHeader,
    title: options.title || 'Destination Mapping',
    useShadowDOM: true, // Enable shadow DOM by default for CSS isolation
  });

  // Debounced update for performance
  const debouncedUpdate = debounce(() => {
    updateResults();
  }, options.updateDelay || 300);

  /**
   * Create components using multi-column layout
   */
  function createComponents(): void {
    // Get column content elements from the multi-column layout
    const eventContentElement = baseApi.getColumnContentElement(0); // First column for Event
    const mappingContentElement = baseApi.getColumnContentElement(1); // Second column for Mapping
    const resultContentElement = baseApi.getColumnContentElement(2); // Third column for Result

    if (
      !eventContentElement ||
      !mappingContentElement ||
      !resultContentElement
    ) {
      throw new Error(
        'Failed to get column content elements from multi-column layout',
      );
    }

    // Create components
    eventEditor = createCodeEditor(eventContentElement, {
      language: 'json',
      value: eventData,
      height: '100%',
      onChange: (value) => {
        eventData = value;
        debouncedUpdate();
      },
    });

    mappingEditor = createCodeEditor(mappingContentElement, {
      language: 'json',
      value: mappingData,
      height: '100%',
      onChange: (value) => {
        mappingData = value;
        debouncedUpdate();
      },
    });

    resultDisplay = createResultDisplay(resultContentElement, {
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

  // Enhanced API
  const api: DestinationAPI = {
    ...baseApi,

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

    destroy(): void {
      cleanup.forEach((fn) => fn());
      eventEditor?.destroy();
      mappingEditor?.destroy();
      resultDisplay?.destroy();
      baseApi.destroy();
    },
  };

  // Initialize component
  createComponents();

  // Mount the base component
  api.mount();

  return api;
}
