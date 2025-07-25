import type { WalkerOS } from '@walkerOS/core';
import { BaseComponent } from '../core/base-component';
import { CodeEditorCSS } from './code-editor-css';
import type {
  ExplorerStateManager,
  DestinationState,
} from '../core/state-manager';

export interface DestinationPushOptions {
  event?: WalkerOS.PartialEvent | string;
  mapping?: WalkerOS.AnyObject | string;
  height?: string;
  showOutput?: boolean;
  showMapping?: boolean;
  label?: string;
  theme?: 'light' | 'dark';
  eventConfig?: boolean;
  smallText?: boolean;
}

/**
 * Component for interactive destination event testing
 */
export class DestinationPush extends BaseComponent {
  private options: Required<DestinationPushOptions>;
  private stateManager: ExplorerStateManager;
  private destinationId: string;
  private eventEditor!: CodeEditorCSS;
  private mappingEditor?: CodeEditorCSS;
  private outputContainer?: HTMLDivElement;
  private outputContent?: HTMLPreElement;
  private executeButton!: HTMLButtonElement;
  private unsubscribe?: () => void;

  constructor(
    container: HTMLElement | string,
    stateManager: ExplorerStateManager,
    destinationId: string,
    options: DestinationPushOptions = {},
  ) {
    // Set default options first
    const defaultOptions = {
      event: options.event || {},
      mapping: options.mapping || {},
      height: options.height || '200px',
      showOutput: options.showOutput !== undefined ? options.showOutput : true,
      showMapping: options.showMapping || false,
      label: options.label || 'Event Testing',
      theme: options.theme || ('light' as 'light' | 'dark'),
      eventConfig: options.eventConfig || false,
      smallText: options.smallText || false,
    };

    super(container, { useShadowDOM: true, autoInitialize: false });

    this.stateManager = stateManager;
    this.destinationId = destinationId;
    this.options = defaultOptions;

    // Initialize after options are set
    this.initialize();
  }

  protected initialize(): void {
    this.injectStyles(this.getStyles());
    this.createElements();
    this.setupStateSubscription();
    this.updateFromState();
  }

  private createElements(): void {
    const root = this.getRoot();

    // Main container
    const mainContainer = this.createContainer('destination-push-container', {
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      padding: '16px',
      border: '1px solid #e5e7eb',
      borderRadius: '8px',
      backgroundColor: this.options.theme === 'dark' ? '#1f2937' : '#ffffff',
      fontSize: this.options.smallText ? '13px' : '14px',
    });

    // Header
    const header = this.createContainer('destination-push-header', {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: '8px',
    });

    const title = this.createElement(
      'h3',
      {},
      {
        margin: '0',
        fontSize: this.options.smallText ? '14px' : '16px',
        fontWeight: '600',
        color: this.options.theme === 'dark' ? '#f3f4f6' : '#1f2937',
      },
    );
    title.textContent = this.options.label;

    // Execute button
    this.executeButton = this.createElement(
      'button',
      { class: 'destination-push-execute', type: 'button' },
      {
        padding: '6px 12px',
        fontSize: this.options.smallText ? '12px' : '13px',
        fontWeight: '500',
        color: '#ffffff',
        backgroundColor: '#3b82f6',
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
      },
    );
    this.executeButton.textContent = 'Send Event';

    header.appendChild(title);
    header.appendChild(this.executeButton);

    // Editors container
    const editorsContainer = this.createContainer('destination-push-editors', {
      display: 'grid',
      gap: '16px',
      gridTemplateColumns: this.options.showMapping ? '1fr 1fr' : '1fr',
    });

    // Event editor
    const eventEditorContainer = this.createContainer(
      'destination-push-event-editor',
    );

    const eventLabel = this.createElement(
      'label',
      {},
      {
        display: 'block',
        marginBottom: '8px',
        fontSize: this.options.smallText ? '12px' : '13px',
        fontWeight: '500',
        color: this.options.theme === 'dark' ? '#d1d5db' : '#6b7280',
      },
    );
    eventLabel.textContent = 'Event Data';

    const eventEditorElement = this.createElement('div');
    this.eventEditor = new CodeEditorCSS(eventEditorElement, {
      language: 'json',
      height: this.options.height,
      value: this.getInitialEventValue(),
      showCopyButton: true,
      theme: this.options.theme,
      fontSize: this.options.smallText ? '12px' : '14px',
    });

    eventEditorContainer.appendChild(eventLabel);
    eventEditorContainer.appendChild(eventEditorElement);
    editorsContainer.appendChild(eventEditorContainer);

    // Mapping editor (if enabled)
    if (this.options.showMapping) {
      const mappingEditorContainer = this.createContainer(
        'destination-push-mapping-editor',
      );

      const mappingLabel = this.createElement(
        'label',
        {},
        {
          display: 'block',
          marginBottom: '8px',
          fontSize: this.options.smallText ? '12px' : '13px',
          fontWeight: '500',
          color: this.options.theme === 'dark' ? '#d1d5db' : '#6b7280',
        },
      );
      mappingLabel.textContent = 'Mapping Configuration';

      const mappingEditorElement = this.createElement('div');
      this.mappingEditor = new CodeEditorCSS(mappingEditorElement, {
        language: 'json',
        height: this.options.height,
        value: this.getInitialMappingValue(),
        showCopyButton: true,
        theme: this.options.theme,
        fontSize: this.options.smallText ? '12px' : '14px',
      });

      mappingEditorContainer.appendChild(mappingLabel);
      mappingEditorContainer.appendChild(mappingEditorElement);
      editorsContainer.appendChild(mappingEditorContainer);
    }

    // Output container
    if (this.options.showOutput) {
      this.outputContainer = this.createContainer('destination-push-output', {
        marginTop: '16px',
      });

      const outputHeader = this.createElement(
        'h4',
        {},
        {
          margin: '0 0 8px 0',
          fontSize: this.options.smallText ? '12px' : '14px',
          fontWeight: '500',
          color: this.options.theme === 'dark' ? '#d1d5db' : '#6b7280',
        },
      );
      outputHeader.textContent = 'Destination Output';

      this.outputContent = this.createElement(
        'pre',
        { class: 'destination-push-output-content' },
        {
          margin: '0',
          padding: '12px',
          fontSize: this.options.smallText ? '11px' : '13px',
          fontFamily:
            'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
          backgroundColor:
            this.options.theme === 'dark' ? '#111827' : '#f9fafb',
          border: '1px solid #e5e7eb',
          borderRadius: '6px',
          overflow: 'auto',
          maxHeight: '300px',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          color: this.options.theme === 'dark' ? '#f3f4f6' : '#1f2937',
        },
      );

      this.outputContainer.appendChild(outputHeader);
      this.outputContainer.appendChild(this.outputContent);
    }

    // Assemble the component
    mainContainer.appendChild(header);
    mainContainer.appendChild(editorsContainer);

    if (this.outputContainer) {
      mainContainer.appendChild(this.outputContainer);
    }

    root.appendChild(mainContainer);

    // Setup event listeners
    this.setupEventListeners();
  }

  private getInitialEventValue(): string {
    let eventValue: WalkerOS.PartialEvent;

    if (typeof this.options.event === 'string') {
      try {
        eventValue = JSON.parse(this.options.event);
      } catch (error) {
        console.error('Invalid JSON in event:', error);
        eventValue = {};
      }
    } else {
      eventValue = this.options.event || {};
    }

    // Add default structure if empty
    if (Object.keys(eventValue).length === 0) {
      eventValue = {
        event: 'custom event',
        data: {
          id: '12345',
          name: 'Example Item',
          category: 'test',
        },
        timestamp: Date.now(),
      };
    }

    return JSON.stringify(eventValue, null, 2);
  }

  private getInitialMappingValue(): string {
    let mappingValue: WalkerOS.AnyObject;

    if (typeof this.options.mapping === 'string') {
      try {
        mappingValue = JSON.parse(this.options.mapping);
      } catch (error) {
        console.error('Invalid JSON in mapping:', error);
        mappingValue = {};
      }
    } else {
      mappingValue = this.options.mapping || {};
    }

    return JSON.stringify(mappingValue, null, 2);
  }

  private setupEventListeners(): void {
    // Execute button
    this.addEventListener(this.executeButton, 'click', () => {
      this.executeEvent();
    });

    // Execute on Ctrl+Enter in event editor
    this.addEventListener(this.eventEditor['textarea'], 'keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        this.executeEvent();
      }
    });
  }

  private async executeEvent(): Promise<void> {
    try {
      // Disable button during execution
      this.executeButton.disabled = true;
      this.executeButton.textContent = 'Sending...';
      this.executeButton.style.backgroundColor = '#6b7280';

      // Parse event data
      const eventData = JSON.parse(this.eventEditor.getValue());

      // TODO: Apply mapping if provided
      let processedEvent = eventData;
      if (this.mappingEditor) {
        const mapping = JSON.parse(this.mappingEditor.getValue());
        // Apply mapping logic here if needed
        processedEvent = this.applyMapping(eventData, mapping);
      }

      // Execute the event
      const result = await this.stateManager.pushEvent(
        this.destinationId,
        processedEvent,
      );

      // Update output
      if (this.outputContent) {
        let output = '';

        if (typeof result === 'string') {
          output = result;
        } else if (result !== undefined) {
          try {
            output = JSON.stringify(result, null, 2);
          } catch (error) {
            output = String(result);
          }
        } else {
          output = 'Event sent successfully (no return value)';
        }

        this.outputContent.textContent = output;
        this.outputContent.style.color =
          this.options.theme === 'dark' ? '#f3f4f6' : '#1f2937';
      }
    } catch (error) {
      // Show error in output
      if (this.outputContent) {
        this.outputContent.textContent = `Error: ${(error as Error).message}`;
        this.outputContent.style.color = '#dc2626';
      }
    } finally {
      // Re-enable button
      this.executeButton.disabled = false;
      this.executeButton.textContent = 'Send Event';
      this.executeButton.style.backgroundColor = '#3b82f6';
    }
  }

  private applyMapping(
    event: WalkerOS.PartialEvent,
    mapping: WalkerOS.AnyObject,
  ): WalkerOS.PartialEvent {
    // Simple mapping application - this could be enhanced with more complex mapping logic
    const mappedEvent = { ...event };

    if (mapping && typeof mapping === 'object') {
      // Apply simple key mappings
      Object.entries(mapping).forEach(([newKey, oldKey]) => {
        if (
          typeof oldKey === 'string' &&
          event.data &&
          (event.data as any)[oldKey] !== undefined
        ) {
          if (!mappedEvent.data) mappedEvent.data = {};
          (mappedEvent.data as any)[newKey] = (event.data as any)[oldKey];
        }
      });
    }

    return mappedEvent;
  }

  private setupStateSubscription(): void {
    this.unsubscribe = this.stateManager.subscribe(
      this.destinationId,
      (state) => {
        this.updateFromState(state);
      },
    );
  }

  private updateFromState(state?: DestinationState): void {
    if (!state) {
      state = this.stateManager.getState(this.destinationId);
      if (!state) return;
    }

    // Update output if there's a state error
    if (state.error && this.outputContent) {
      this.outputContent.textContent = `State Error: ${state.error.message}`;
      this.outputContent.style.color = '#dc2626';
    }
  }

  private getStyles(): string {
    return `
      .destination-push-container {
        font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif;
      }
      
      .destination-push-execute:hover:not(:disabled) {
        background-color: #2563eb;
        transform: translateY(-1px);
      }
      
      .destination-push-execute:disabled {
        cursor: not-allowed;
        opacity: 0.7;
      }
      
      .destination-push-output-content {
        transition: all 0.2s ease;
      }
      
      .destination-push-output-content:empty::before {
        content: "Click 'Send Event' to see output...";
        color: ${this.options.theme === 'dark' ? '#9ca3af' : '#6b7280'};
        font-style: italic;
      }
    `;
  }

  // Public API methods

  /**
   * Set the event data
   */
  setEvent(event: WalkerOS.PartialEvent): void {
    const eventString = JSON.stringify(event, null, 2);
    this.eventEditor.setValue(eventString);
  }

  /**
   * Get the current event data
   */
  getEvent(): WalkerOS.PartialEvent {
    try {
      return JSON.parse(this.eventEditor.getValue());
    } catch (error) {
      console.error('Invalid JSON event data:', error);
      return {};
    }
  }

  /**
   * Set the mapping configuration
   */
  setMapping(mapping: WalkerOS.AnyObject): void {
    if (this.mappingEditor) {
      const mappingString = JSON.stringify(mapping, null, 2);
      this.mappingEditor.setValue(mappingString);
    }
  }

  /**
   * Get the current mapping configuration
   */
  getMapping(): WalkerOS.AnyObject {
    if (this.mappingEditor) {
      try {
        return JSON.parse(this.mappingEditor.getValue());
      } catch (error) {
        console.error('Invalid JSON mapping data:', error);
        return {};
      }
    }
    return {};
  }

  /**
   * Execute the current event
   */
  async execute(): Promise<void> {
    return this.executeEvent();
  }

  /**
   * Focus the event editor
   */
  focus(): void {
    this.eventEditor.focus();
  }

  protected onDestroy(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
    if (this.eventEditor) {
      this.eventEditor.destroy();
    }
    if (this.mappingEditor) {
      this.mappingEditor.destroy();
    }
  }
}
