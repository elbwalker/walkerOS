/**
 * Destination Component - Three-column layout for Event, Mapping, and Result
 *
 * Features:
 * - Three-column layout with Event, Mapping, and Result
 * - Two CodeEditor components for JSON input
 * - Live walkerOS collector integration with custom destination
 * - Real destination processing with mapping transformations
 * - Wrap function to capture destination calls and display results
 * - Theme-aware styling with shadow DOM support
 */

import {
  createMultiColumnLayout,
  type MultiColumnLayoutAPI,
} from '../core/MultiColumnLayout';
import { createCodeEditor, type CodeEditorAPI } from './CodeEditor';
import { createResultDisplay, type ResultDisplayAPI } from './ResultDisplay';
import { debounce } from '../utils/debounce';
import { createCollector } from '@walkeros/collector';
import type { Collector, WalkerOS, Destination, Elb } from '@walkeros/core';
import { toggleElementTheme, getElementTheme } from '../core/css-theme-system';

export interface DestinationOptions {
  height?: string;
  showHeader?: boolean;
  title?: string;
  initialEvent?: string;
  initialMapping?: string;
  updateDelay?: number;
  destination?: Destination.Instance;
}

interface CapturedResult {
  type?: string;
  mappingRule?: string;
  data?: unknown;
  event?: unknown;
  message?: string;
  [key: string]: unknown;
}

export interface DestinationAPI extends MultiColumnLayoutAPI {
  getEventData(): string;
  setEventData(data: string): void;
  getMappingData(): string;
  setMappingData(data: string): void;
  getResults(): CapturedResult[];
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
  let eventData = options.initialEvent || '';
  let mappingData = options.initialMapping || '';
  let eventEditor: CodeEditorAPI;
  let mappingEditor: CodeEditorAPI;
  let resultDisplay: ResultDisplayAPI;
  let elbFunction: Elb.Fn | null = null;
  let collector: Collector.Instance | null = null;
  let capturedResults: CapturedResult[] = [];

  // Create multi-column layout with 3 columns
  const { api: baseApi, cleanup } = createMultiColumnLayout(elementOrSelector, {
    columns: [
      {
        title: 'Event',
        className: 'explorer-unified-container--code-editor',
      },
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
  });

  // Add theme toggle functionality to the first column header
  const handleThemeToggle = () => {
    const element = baseApi.getElement();
    if (element) {
      const newTheme = toggleElementTheme(element);
      // Update theme icon in any theme buttons found
      const themeButtons = element.querySelectorAll(
        '.explorer-unified-header__btn--theme',
      );
      themeButtons.forEach((btn) => {
        btn.textContent = newTheme === 'dark' ? '☀️' : '🌙';
      });
    }
  };

  // Get the first column container and add theme toggle to its header
  setTimeout(() => {
    const firstColumn = baseApi.getColumnElement(0);
    if (firstColumn) {
      const container = firstColumn.querySelector(
        '.explorer-unified-container',
      ) as HTMLElement;
      if (container) {
        // Access the container's header API to add theme toggle
        const headerElement = container.querySelector(
          '.explorer-unified-header',
        );
        if (headerElement) {
          const actionsElement = headerElement.querySelector(
            '.explorer-unified-header__actions',
          );
          if (actionsElement) {
            // Create theme toggle button
            const themeBtn = document.createElement('button');
            themeBtn.className =
              'explorer-unified-header__btn explorer-unified-header__btn--theme';
            themeBtn.textContent =
              getElementTheme(baseApi.getElement()!) === 'dark' ? '☀️' : '🌙';
            themeBtn.title = 'Toggle theme';
            themeBtn.addEventListener('click', handleThemeToggle);
            actionsElement.appendChild(themeBtn);
          }
        }
      }
    }
  }, 10);

  // Debounced update for performance
  const debouncedUpdate = debounce(() => {
    updateResults();
  }, options.updateDelay || 300);

  /**
   * Create default demo destination if none provided
   */
  function createDemoDestination(): Destination.Instance {
    return {
      type: 'demo',
      config: {},

      push(event: WalkerOS.Event, context: Destination.PushContext) {
        const { data, mapping } = context;

        // Clear previous results for this push
        capturedResults = [];

        // Show what the destination receives after collector processing
        if (data !== undefined) {
          // Mapping produced data - this is what would be sent to the destination
          capturedResults.push({
            type: 'mapped_result',
            mappingRule: mapping?.name || 'default',
            data: data,
            timestamp: Date.now(),
          });
        } else {
          // No mapping matched or no data produced
          capturedResults.push({
            type: 'no_mapping',
            event: event,
            message: 'No mapping rule matched or no data produced',
            timestamp: Date.now(),
          });
        }

        // Update display to show the result
        updateResultDisplay();
      },
    };
  }

  /**
   * Initialize the walkerOS collector with destination
   */
  async function initializeCollector(): Promise<{
    elb: Elb.Fn;
    collector: Collector.Instance;
  } | null> {
    try {
      // Use provided destination or create default demo destination
      const destination = options.destination || createDemoDestination();

      const { elb, collector: newCollector } = await createCollector({
        destinations: {
          demo: destination,
        },
        run: true,
      });

      return { elb, collector: newCollector };
    } catch (error) {
      capturedResults = [
        {
          type: 'error',
          message: `Failed to initialize collector: ${String(error)}`,
          timestamp: Date.now(),
        },
      ];
      updateResultDisplay();
      return null;
    }
  }

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
      maxResults: 1,
    });

    // Show initial ready state
    updateResultDisplay();

    // Initialize collector once
    initializeCollector().then((result) => {
      if (result) {
        elbFunction = result.elb;
        collector = result.collector;
        // Initial update after collector is ready
        setTimeout(() => {
          updateResults();
        }, 200);
      }
    });
  }

  /**
   * Update results by processing event through walkerOS collector
   */
  async function updateResults(): Promise<void> {
    try {
      // Clear previous results
      capturedResults = [];

      if (!elbFunction) {
        resultDisplay.clear();
        resultDisplay.addError('Collector not initialized');
        return;
      }

      // Parse and push event through collector
      let parsedEvent: WalkerOS.PartialEvent | null;
      try {
        parsedEvent = eventData.trim()
          ? (JSON.parse(eventData) as WalkerOS.PartialEvent)
          : null;
      } catch (error) {
        resultDisplay.clear();
        resultDisplay.addError(`Invalid JSON in Event: ${String(error)}`);
        return;
      }

      if (parsedEvent) {
        // Update destination mapping before pushing
        updateDestinationMapping();

        // Push event through collector using elb function - this will trigger our destination
        await elbFunction(parsedEvent);
      }

      // Update display will be called by the destination push function
    } catch (error) {
      resultDisplay.clear();
      resultDisplay.addError(`Processing error: ${String(error)}`);
    }
  }

  /**
   * Update destination mapping by directly modifying the collector's destination config
   */
  function updateDestinationMapping(): void {
    if (!collector) return;

    try {
      // Parse and set mapping directly on the existing destination
      const demoDestination = collector.destinations.demo;
      if (demoDestination && mappingData.trim()) {
        const mapping = JSON.parse(mappingData);
        demoDestination.config.mapping = mapping;
      }
    } catch (error) {
      capturedResults.push({
        type: 'error',
        message: `Failed to update mapping: ${String(error)}`,
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Update the result display with captured results
   */
  function updateResultDisplay(): void {
    resultDisplay.clear();

    if (capturedResults.length === 0) {
      resultDisplay.addInfo(
        'Ready - modify the event or mapping and see the destination processing results',
      );
      return;
    }

    capturedResults.forEach((result) => {
      if (result.type === 'mapped_result') {
        // Show the mapped data cleanly
        resultDisplay.addValue(
          result.data,
          `Destination receives (${result.mappingRule})`,
        );
      } else if (result.type === 'no_mapping') {
        resultDisplay.addInfo(result.message || 'No mapping applied');
      } else {
        // Fallback for any other types
        resultDisplay.addValue(result);
      }
    });
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

    getResults(): CapturedResult[] {
      return capturedResults || [];
    },

    refresh(): void {
      updateResults();
    },

    clear(): void {
      eventData = '{}';
      mappingData = '{}';
      eventEditor?.setValue('{}');
      mappingEditor?.setValue('{}');
      capturedResults = [];
      resultDisplay?.clear();
    },

    destroy(): void {
      cleanup.forEach((fn) => fn());
      eventEditor?.destroy();
      mappingEditor?.destroy();
      resultDisplay?.destroy();
      elbFunction = null;
      collector = null;
      capturedResults = [];
      baseApi.destroy();
    },
  };

  // Initialize component
  createComponents();

  // Mount the base component
  api.mount();

  return api;
}
