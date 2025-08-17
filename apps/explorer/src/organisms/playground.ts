/**
 * Playground Organism
 * Main component that demonstrates the complete walkerOS event flow
 */

import { createGraph, type GraphAPI } from '../graph/api';
import { createColumns } from '../layouts/columns';
import { createCodeBox } from '../molecules/codeBox';
import { createBox } from '../atoms/box';
import { createElement, createShadow } from '../lib/dom';
import { HTMLNode } from '../nodes/html';
import { MappingNode } from '../nodes/mapping';
import type { WalkerOS } from '@walkeros/core';
import type { DOMEvent, CodeContent } from '../graph/types';
import { debounce } from '../lib/debounce';

export interface PlaygroundOptions {
  height?: string;
  initialHTML?: string;
  initialCSS?: string;
  initialJS?: string;
  initialMapping?: any;
  showConsole?: boolean;
}

export interface PlaygroundAPI {
  execute: () => Promise<void>;
  setHTML: (html: string) => void;
  setCSS: (css: string) => void;
  setJS: (js: string) => void;
  setAllCode: (content: CodeContent) => void;
  setMapping: (mapping: any) => void;
  getGraph: () => GraphAPI;
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

  // Create graph
  const graph = createGraph();

  // Create layout with columns
  const layout = createColumns(container, {
    columns: [
      { width: '20%', minWidth: '200px' }, // HTML
      { width: '20%', minWidth: '200px' }, // Preview
      { width: '20%', minWidth: '200px' }, // Events
      { width: '20%', minWidth: '200px' }, // Mapping
      { width: '20%', minWidth: '200px' }, // Destination
    ],
    direction: 'horizontal',
    responsive: true,
    gap: 'var(--elb-spacing-md, 16px)',
  });

  // Create UI components
  let htmlEditor: any;
  let previewContainer: HTMLElement;
  let eventsDisplay: any;
  let mappingEditor: any;
  let destinationDisplay: any;

  // Node IDs
  let htmlNodeId: string;
  let previewNodeId: string;
  let collectorNodeId: string;
  let mappingNodeId: string;
  let destinationNodeId: string;

  // Initialize components
  function initialize() {
    // Code Editor with tabs
    const codeBox = createBox(layout.getColumn(0), {
      label: 'Code Editor',
      showHeader: true,
    });

    htmlEditor = createCodeBox(codeBox.getContent(), {
      label: '',
      tabs: {
        enabled: true,
        items: ['html', 'css', 'js'],
        active: 'html',
      },
      lineNumbers: true,
      showControls: true,
      onTabChange: debounce((tab, content) => handleCodeChange(content), 300),
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

    previewContainer = createElement('div', {
      class: 'preview-container',
    });
    previewBox.getContent().appendChild(previewContainer);

    // Events Display
    const eventsBox = createBox(layout.getColumn(2), {
      label: 'Captured Events',
      showHeader: true,
    });

    eventsDisplay = createCodeBox(eventsBox.getContent(), {
      label: '',
      value: '// No events captured yet',
      language: 'json',
      readOnly: true,
      lineNumbers: false,
    });

    // Mapping Editor
    const mappingBox = createBox(layout.getColumn(3), {
      label: 'Event Mapping',
      showHeader: true,
    });

    mappingEditor = createCodeBox(mappingBox.getContent(), {
      label: '',
      value: JSON.stringify(
        options.initialMapping || MappingNode.getExampleMapping(),
        null,
        2,
      ),
      language: 'json',
      lineNumbers: true,
      showControls: true,
      onChange: debounce(() => handleMappingChange(), 300),
    });

    // Destination Display
    const destinationBox = createBox(layout.getColumn(4), {
      label: 'Destination Calls',
      showHeader: true,
    });

    destinationDisplay = createCodeBox(destinationBox.getContent(), {
      label: '',
      value: '// No destination calls yet',
      language: 'javascript',
      readOnly: true,
      lineNumbers: false,
    });

    // Create graph nodes
    setupGraph();

    // Initial execution
    executeGraph();
  }

  /**
   * Setup graph nodes and connections
   */
  function setupGraph() {
    // Get initial content from editor
    const initialContent = htmlEditor.getAllValues();

    // Add nodes
    htmlNodeId = graph.addNode('html', {
      label: 'Code Editor',
      initialValue: initialContent,
    });

    // Set the HTMLNode's value after creation
    const htmlNode = graph.getNode(htmlNodeId) as any;
    if (htmlNode) {
      htmlNode.setAllCodes(initialContent);
      htmlNode.setValue(initialContent);
    }

    previewNodeId = graph.addNode('preview', {
      label: 'Preview',
    });

    collectorNodeId = graph.addNode('collector', {
      label: 'Event Collector',
    });

    mappingNodeId = graph.addNode('mapping', {
      label: 'Mapping',
      initialValue: JSON.parse(mappingEditor.getValue()),
    });

    destinationNodeId = graph.addNode('destination', {
      label: 'GA4 Destination',
      initialValue: { type: 'ga4', calls: [] },
    });

    // Connect nodes
    graph.connect(
      { nodeId: htmlNodeId, portId: 'code' },
      { nodeId: previewNodeId, portId: 'code' },
    );

    graph.connect(
      { nodeId: previewNodeId, portId: 'dom' },
      { nodeId: collectorNodeId, portId: 'events' },
    );

    graph.connect(
      { nodeId: collectorNodeId, portId: 'processed' },
      { nodeId: mappingNodeId, portId: 'events' },
    );

    graph.connect(
      { nodeId: mappingNodeId, portId: 'transformed' },
      { nodeId: destinationNodeId, portId: 'events' },
    );

    // Setup preview node to render in our container
    const previewNode = graph.getNode(previewNodeId) as any;
    if (previewNode) {
      // Listen for DOM events
      previewNode.onDOMEvent = (event: DOMEvent) => {
        // Update display when DOM events occur
        updateEventsDisplay();
        // Trigger graph execution to process the event
        executeGraph();
      };
    }
  }

  /**
   * Handle code changes (HTML/CSS/JS)
   */
  async function handleCodeChange(content: CodeContent) {
    const htmlNode = graph.getNode(htmlNodeId) as any;
    if (htmlNode) {
      htmlNode.setAllCodes(content);
      htmlNode.setValue(content); // Also set as the node's value
      await executeGraph();

      // After execution, mount the preview container
      const previewNode = graph.getNode(previewNodeId) as any;
      if (previewNode) {
        const nodeContainer = previewNode.getContainer();
        if (nodeContainer && previewContainer) {
          previewContainer.innerHTML = '';
          previewContainer.appendChild(nodeContainer);
        }
      }
    }
  }

  /**
   * Handle mapping changes
   */
  async function handleMappingChange() {
    try {
      const mapping = JSON.parse(mappingEditor.getValue());
      const mappingNode = graph.getNode(mappingNodeId) as any;
      if (mappingNode) {
        mappingNode.setMappingRules(mapping);
        await executeGraph();
      }
    } catch (error) {
      console.error('Invalid mapping JSON:', error);
    }
  }

  /**
   * Execute the graph
   */
  async function executeGraph() {
    try {
      const result = await graph.execute();

      // Update displays
      updateEventsDisplay();
      updateDestinationDisplay();

      console.log('Graph execution result:', result);
    } catch (error) {
      console.error('Graph execution error:', error);
    }
  }

  /**
   * Update events display
   */
  function updateEventsDisplay() {
    const collectorNode = graph.getNode(collectorNodeId) as any;
    if (collectorNode) {
      const events = collectorNode.getProcessedEvents();
      if (events && events.length > 0) {
        eventsDisplay.setValue(JSON.stringify(events, null, 2));
      } else {
        // Show DOM events from preview if no processed events yet
        const previewNode = graph.getNode(previewNodeId) as any;
        if (previewNode) {
          const domEvents = previewNode.getDOMEvents();
          if (domEvents && domEvents.length > 0) {
            eventsDisplay.setValue(
              '// DOM Events (not yet processed):\n' +
                JSON.stringify(domEvents, null, 2),
            );
          }
        }
      }
    }
  }

  /**
   * Update destination display
   */
  function updateDestinationDisplay() {
    const destNode = graph.getNode(destinationNodeId) as any;
    if (destNode) {
      const code = destNode.getCallsAsCode();
      if (code) {
        destinationDisplay.setValue(code);
      }
    }
  }

  // Initialize
  initialize();

  // Execute initial graph to render preview
  setTimeout(() => {
    const initialContent = htmlEditor.getAllValues();
    handleCodeChange(initialContent);
  }, 100);

  // Set height if provided
  if (options.height) {
    container.style.height = options.height;
  }

  // API
  return {
    execute: executeGraph,

    setHTML: (html: string) => {
      const currentValues = htmlEditor.getAllValues();
      htmlEditor.setAllValues({ ...currentValues, html });
      handleCodeChange({ ...currentValues, html });
    },

    setCSS: (css: string) => {
      const currentValues = htmlEditor.getAllValues();
      htmlEditor.setAllValues({ ...currentValues, css });
      handleCodeChange({ ...currentValues, css });
    },

    setJS: (js: string) => {
      const currentValues = htmlEditor.getAllValues();
      htmlEditor.setAllValues({ ...currentValues, js });
      handleCodeChange({ ...currentValues, js });
    },

    setAllCode: (content: CodeContent) => {
      htmlEditor.setAllValues(content);
      handleCodeChange(content);
    },

    setMapping: (mapping: any) => {
      mappingEditor.setValue(JSON.stringify(mapping, null, 2));
      handleMappingChange();
    },

    getGraph: () => graph,

    destroy: () => {
      graph.clear();
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
      min-height: 300px;
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
