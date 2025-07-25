import { BaseComponent } from '../core/base-component';
import { CodeBoxCSS } from './code-box-css';
import { HtmlPreview } from './html-preview';
import { ResultDisplayCSS } from './result-display-css';
import { SharedHeader, type HeaderAction, ICONS } from '../core/shared-header';

export interface EventFlowOptions {
  code?: string;
  mapping?: string;
  height?: string;
  theme?: 'light' | 'dark';
  previewId?: string;
  eventFn?: (event: any) => any;
  resultFn?: (output: any) => string;
  showFullscreen?: boolean;
  onEvent?: (event: any) => void;
  onResult?: (result: any) => void;
  onError?: (error: Error) => void;
}

/**
 * EventFlow component - 5-panel layout for walkerOS event flow visualization
 * Replaces React EventFlow component with vanilla JS implementation
 */
export class EventFlow extends BaseComponent {
  private options: Required<EventFlowOptions>;
  private sharedHeader: SharedHeader;
  private headerContainer?: HTMLDivElement;
  private contentContainer!: HTMLDivElement;

  // Panel components
  private htmlCodeBox!: CodeBoxCSS;
  private htmlPreview!: HtmlPreview;
  private eventDisplay!: ResultDisplayCSS;
  private mappingCodeBox!: CodeBoxCSS;
  private resultDisplay!: ResultDisplayCSS;

  // State
  private currentEvents: any[] = [];
  private debounceTimers: { [key: string]: ReturnType<typeof setTimeout> } = {};
  private isProcessing = false;

  constructor(container: HTMLElement | string, options: EventFlowOptions = {}) {
    const defaultOptions = {
      code:
        options.code ||
        '<div data-elb="product" data-elb-id="123">\n  <h3>Sample Product</h3>\n  <button data-elbaction="add_to_cart">Add to Cart</button>\n</div>',
      mapping:
        options.mapping ||
        '{\n  "product": {\n    "add_to_cart": {\n      "name": "product_added_to_cart"\n    }\n  }\n}',
      height: options.height || '500px',
      theme: options.theme || ('light' as 'light' | 'dark'),
      previewId: options.previewId || `eventflow-${Date.now()}`,
      eventFn: options.eventFn || ((event: any) => event),
      resultFn:
        options.resultFn || ((output: any) => JSON.stringify(output, null, 2)),
      showFullscreen:
        options.showFullscreen !== undefined ? options.showFullscreen : true,
      onEvent: options.onEvent || (() => {}),
      onResult: options.onResult || (() => {}),
      onError: options.onError || (() => {}),
    };

    super(container, { useShadowDOM: true, autoInitialize: false });

    this.options = defaultOptions;
    this.sharedHeader = new SharedHeader(this.createElement.bind(this));
    this.initialize();
  }

  protected initialize(): void {
    try {
      this.injectStyles(this.getStyles());
      this.createElements();
    } catch (error) {
      console.error('EventFlow initialization error:', error);
      this.options.onError(
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  }

  private createElements(): void {
    const root = this.getRoot();

    // Main container
    const mainContainer = this.createContainer('event-flow-container', {
      display: 'flex',
      flexDirection: 'column',
      border: '1px solid #d1d5db',
      borderRadius: '8px',
      backgroundColor: this.options.theme === 'dark' ? '#1f2937' : '#ffffff',
      overflow: 'hidden',
      height: this.options.height,
    });

    // Header
    this.headerContainer = this.createHeader();
    mainContainer.appendChild(this.headerContainer);

    // Content container with 5 panels
    this.contentContainer = this.createContainer('event-flow-content', {
      display: 'grid',
      gridTemplateColumns: 'repeat(5, minmax(200px, 1fr))',
      flex: '1',
      minHeight: '0',
      gap: '1px',
      backgroundColor: '#e5e7eb',
      overflow: 'auto',
    });

    this.createPanels();
    mainContainer.appendChild(this.contentContainer);
    root.appendChild(mainContainer);
  }

  private createHeader(): HTMLDivElement {
    const actions: HeaderAction[] = [
      {
        id: 'execute',
        icon: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polygon points="5,3 19,12 5,21"></polygon>
        </svg>`,
        title: 'Execute event flow',
        onClick: () => this.executeFlow(),
      },
      {
        id: 'reset',
        icon: ICONS.reset,
        title: 'Reset to defaults',
        onClick: () => this.reset(),
      },
      {
        id: 'clear-events',
        icon: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="3,6 5,6 21,6"></polyline>
          <path d="M19,6V20a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6M8,6V4a2,2,0,0,1,2-2h4a2,2,0,0,1,2,2V6"></path>
          <line x1="10" y1="11" x2="10" y2="17"></line>
          <line x1="14" y1="11" x2="14" y2="17"></line>
        </svg>`,
        title: 'Clear events',
        onClick: () => this.clearEventsInternal(),
      },
    ];

    if (this.options.showFullscreen) {
      actions.push({
        id: 'fullscreen',
        icon: ICONS.fullscreen,
        title: 'Toggle fullscreen',
        onClick: () => this.toggleFullscreen(),
      });
    }

    return this.sharedHeader.create({
      label: 'EventFlow - walkerOS Event Visualization',
      showLabel: true,
      actions,
      theme: this.options.theme,
      className: 'event-flow-header',
    });
  }

  private createPanels(): void {
    try {
      // 1. HTML Panel
      const htmlPanel = this.createPanel('html-panel');
      this.htmlCodeBox = new CodeBoxCSS(htmlPanel, {
        label: 'HTML',
        value: this.options.code,
        language: 'html',
        height: '100%',
        showCopy: true,
        theme: this.options.theme,
        onChange: () => this.scheduleUpdate('html'),
      });
      this.contentContainer.appendChild(htmlPanel);

      // 2. Preview Panel
      const previewPanel = this.createPanel('preview-panel');
      this.htmlPreview = new HtmlPreview(previewPanel, {
        html: this.options.code,
        previewId: this.options.previewId,
        height: '100%',
        onElementClick: (element, event) =>
          this.handleElementClick(element, event),
      });
      this.contentContainer.appendChild(previewPanel);

      // 3. Event Panel
      const eventPanel = this.createPanel('event-panel');
      this.eventDisplay = new ResultDisplayCSS(eventPanel, {
        value: { message: 'Click elements in preview to capture events...' },
        height: '100%',
        theme: this.options.theme,
        expandable: true,
      });
      this.contentContainer.appendChild(eventPanel);

      // 4. Mapping Panel
      const mappingPanel = this.createPanel('mapping-panel');
      this.mappingCodeBox = new CodeBoxCSS(mappingPanel, {
        label: 'Mapping',
        value: this.options.mapping,
        language: 'json',
        height: '100%',
        showCopy: true,
        theme: this.options.theme,
        onChange: () => this.scheduleUpdate('mapping'),
      });
      this.contentContainer.appendChild(mappingPanel);

      // 5. Result Panel
      const resultPanel = this.createPanel('result-panel');
      this.resultDisplay = new ResultDisplayCSS(resultPanel, {
        value: { message: 'Process events through mapping to see results...' },
        height: '100%',
        theme: this.options.theme,
        expandable: true,
      });
      this.contentContainer.appendChild(resultPanel);
    } catch (error) {
      console.error('EventFlow panel creation error:', error);
      this.options.onError(
        error instanceof Error ? error : new Error(String(error)),
      );

      // Create a simple error panel if initialization fails
      const errorPanel = this.createPanel('error-panel');
      errorPanel.innerHTML = `
        <div style="padding: 20px; color: #dc2626; background: #fef2f2; border-radius: 6px; margin: 10px;">
          <h3>EventFlow Initialization Error</h3>
          <p>Failed to create panels: ${error instanceof Error ? error.message : String(error)}</p>
        </div>
      `;
      this.contentContainer.appendChild(errorPanel);
    }
  }

  private createPanel(className: string): HTMLDivElement {
    return this.createContainer(className, {
      backgroundColor: this.options.theme === 'dark' ? '#1f2937' : '#ffffff',
      display: 'flex',
      flexDirection: 'column',
      minHeight: '0',
      overflow: 'hidden',
    });
  }

  private scheduleUpdate(type: 'html' | 'mapping'): void {
    if (this.debounceTimers[type]) {
      clearTimeout(this.debounceTimers[type]);
    }

    const delay = type === 'html' ? 200 : 600; // HTML updates faster than mapping
    this.debounceTimers[type] = setTimeout(() => {
      if (type === 'html') {
        this.updatePreview();
      } else if (type === 'mapping') {
        this.processEvents();
      }
    }, delay);
  }

  private updatePreview(): void {
    const html = this.htmlCodeBox.getValue();
    this.htmlPreview.setHtml(html);
    // Clear events when HTML changes
    this.clearEventsInternal();
  }

  private handleElementClick(element: HTMLElement, event: MouseEvent): void {
    // Simulate walkerOS event capture
    const walkerEvent = this.createWalkerEvent(element, 'click');
    this.handleWalkerEvent(walkerEvent);

    // Highlight the clicked element
    this.htmlPreview.highlightElement(element);
  }

  private createWalkerEvent(element: HTMLElement, action: string): any {
    const attributes: { [key: string]: string } = {};
    Array.from(element.attributes).forEach((attr) => {
      attributes[attr.name] = attr.value;
    });

    // Extract walkerOS data attributes
    const entity = element.getAttribute('data-elb') || '';
    const entityId = element.getAttribute('data-elb-id') || '';
    const actionType = element.getAttribute('data-elbaction') || action;

    return {
      event: actionType,
      data: {
        [entity]: {
          id: entityId || undefined,
        },
      },
      context: {
        [entity]: [
          {
            id: entityId || undefined,
          },
        ],
      },
      globals: {},
      custom: {},
      user: {},
      nested: [],
      consent: { functional: true },
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      trigger: action,
      entity,
      source: {
        type: 'web',
        id: this.options.previewId,
      },
      timing: Date.now(),
      group: Date.now().toString(),
      count: 1,
      version: {
        walker: '2.0.0',
        config: 1,
      },
    };
  }

  private handleWalkerEvent(event: any): void {
    // Apply event transformation if provided
    const transformedEvent = this.options.eventFn(event);

    // Add to events array
    this.currentEvents.push(transformedEvent);

    // Update event display
    this.eventDisplay.setValue({
      events: this.currentEvents,
      count: this.currentEvents.length,
      latest: transformedEvent,
    });

    // Trigger callback
    this.options.onEvent(transformedEvent);

    // Process through mapping
    this.scheduleUpdate('mapping');
  }

  private async processEvents(): Promise<void> {
    if (this.isProcessing || this.currentEvents.length === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      // Show processing state
      this.resultDisplay.setValue({
        status: 'Processing events through mapping...',
      });

      // Parse mapping configuration
      let mapping: any = {};
      try {
        const mappingText = this.mappingCodeBox.getValue();
        mapping = mappingText.trim() ? JSON.parse(mappingText) : {};
      } catch (error) {
        throw new Error(
          `Invalid mapping JSON: ${error instanceof Error ? error.message : String(error)}`,
        );
      }

      // Process each event through mapping
      const results = [];
      for (const event of this.currentEvents) {
        const result = await this.processEventThroughMapping(event, mapping);
        if (result) {
          results.push(result);
        }
      }

      // Format and display results
      const formattedResults = this.options.resultFn({
        mapping,
        events: this.currentEvents,
        results,
        summary: {
          totalEvents: this.currentEvents.length,
          processedEvents: results.length,
          timestamp: new Date().toISOString(),
        },
      });

      this.resultDisplay.setValue(formattedResults);
      this.options.onResult(results);
    } catch (error) {
      const errorObj = {
        error: error instanceof Error ? error.message : String(error),
        mapping: this.mappingCodeBox.getValue(),
        events: this.currentEvents,
        timestamp: new Date().toISOString(),
      };

      this.resultDisplay.setValue(errorObj);
      this.options.onError(
        error instanceof Error ? error : new Error(String(error)),
      );
      console.error('EventFlow processing error:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  private async processEventThroughMapping(
    event: any,
    mapping: any,
  ): Promise<any> {
    // Simple mapping processor - maps entity.action to configured event names
    const entity = event.entity;
    const action = event.event;

    if (mapping[entity] && mapping[entity][action]) {
      const mappingConfig = mapping[entity][action];

      return {
        ...event,
        event: mappingConfig.name || action,
        mappedBy: {
          entity,
          action,
          config: mappingConfig,
        },
        data: {
          ...event.data,
          ...mappingConfig.data,
        },
      };
    }

    return event; // Return original if no mapping found
  }

  private executeFlow(): void {
    this.updatePreview();
    this.processEvents();
  }

  private clearEventsInternal(): void {
    this.currentEvents = [];
    this.eventDisplay.setValue({
      message: 'Click elements in preview to capture events...',
    });
    this.resultDisplay.setValue({
      message: 'Process events through mapping to see results...',
    });
    this.htmlPreview.clearHighlights();
  }

  private reset(): void {
    this.htmlCodeBox.setValue(this.options.code);
    this.mappingCodeBox.setValue(this.options.mapping);
    this.clearEventsInternal();
    this.updatePreview();
  }

  private toggleFullscreen(): void {
    // Simple fullscreen toggle
    const container = this.container;
    if (!document.fullscreenElement) {
      container.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  }

  private getStyles(): string {
    return `
      ${SharedHeader.getDefaultCSS(this.options.theme)}
      
      .event-flow-container {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        box-sizing: border-box;
      }

      .event-flow-container * {
        box-sizing: border-box;
      }

      .event-flow-content {
        container-type: inline-size;
      }

      /* Explicit grid positioning for all panels */
      .html-panel {
        grid-column: 1;
        grid-row: 1;
      }
      
      .preview-panel {
        grid-column: 2;
        grid-row: 1;
      }
      
      .event-panel {
        grid-column: 3;
        grid-row: 1;
      }
      
      .mapping-panel {
        grid-column: 4;
        grid-row: 1;
      }
      
      .result-panel {
        grid-column: 5;
        grid-row: 1;
      }

      /* Responsive layout */
      @media (max-width: 1200px) {
        .event-flow-content {
          grid-template-columns: 1fr 1fr !important;
          grid-template-rows: auto auto auto;
        }
        
        .html-panel {
          grid-column: 1;
          grid-row: 1;
        }
        
        .preview-panel {
          grid-column: 2;
          grid-row: 1;
        }
        
        .event-panel {
          grid-column: 1;
          grid-row: 2;
        }
        
        .mapping-panel {
          grid-column: 2;
          grid-row: 2;
        }
        
        .result-panel {
          grid-column: 1 / -1;
          grid-row: 3;
        }
      }

      @media (max-width: 768px) {
        .event-flow-content {
          grid-template-columns: 1fr !important;
          grid-template-rows: repeat(5, auto);
        }
        
        .html-panel { 
          grid-column: 1;
          grid-row: 1; 
        }
        .preview-panel { 
          grid-column: 1;
          grid-row: 2; 
        }
        .event-panel { 
          grid-column: 1;
          grid-row: 3; 
        }
        .mapping-panel { 
          grid-column: 1;
          grid-row: 4; 
        }
        .result-panel { 
          grid-column: 1;
          grid-row: 5; 
        }
      }

      /* Panel transitions */
      .html-panel,
      .preview-panel,
      .event-panel,
      .mapping-panel,
      .result-panel {
        transition: all 0.2s ease;
      }

      /* Processing states */
      .event-flow-processing {
        opacity: 0.6;
        pointer-events: none;
      }

      /* Fullscreen styles */
      .event-flow-container:fullscreen {
        height: 100vh !important;
        border-radius: 0 !important;
      }
    `;
  }

  // Public API methods

  getHtml(): string {
    return this.htmlCodeBox.getValue();
  }

  setHtml(html: string): void {
    this.htmlCodeBox.setValue(html);
    this.scheduleUpdate('html');
  }

  getMapping(): any {
    try {
      return JSON.parse(this.mappingCodeBox.getValue());
    } catch {
      return {};
    }
  }

  setMapping(mapping: any): void {
    this.mappingCodeBox.setValue(JSON.stringify(mapping, null, 2));
    this.scheduleUpdate('mapping');
  }

  getEvents(): any[] {
    return [...this.currentEvents];
  }

  simulateEvent(event: any): void {
    this.handleWalkerEvent(event);
  }

  clearEvents(): void {
    this.currentEvents = [];
    this.eventDisplay.setValue({
      message: 'Click elements in preview to capture events...',
    });
    this.resultDisplay.setValue({
      message: 'Process events through mapping to see results...',
    });
    this.htmlPreview.clearHighlights();
  }

  protected onDestroy(): void {
    // Clear all debounce timers
    Object.values(this.debounceTimers).forEach((timer) => clearTimeout(timer));

    // Destroy child components
    [
      this.htmlCodeBox,
      this.htmlPreview,
      this.eventDisplay,
      this.mappingCodeBox,
      this.resultDisplay,
    ].forEach((component) => {
      if (component && !component.isDestroyed()) {
        component.destroy();
      }
    });
  }
}
