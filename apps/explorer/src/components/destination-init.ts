import type { WalkerOS } from '@walkerOS/core';
import { BaseComponent } from '../core/base-component';
import { CodeEditorCSS } from './code-editor-css';
import type {
  ExplorerStateManager,
  DestinationState,
} from '../core/state-manager';

export interface DestinationInitOptions {
  custom?: WalkerOS.AnyObject | string;
  height?: string;
  showOutput?: boolean;
  label?: string;
  theme?: 'light' | 'dark';
}

/**
 * Component for interactive destination configuration testing
 */
export class DestinationInit extends BaseComponent {
  private options: Required<DestinationInitOptions>;
  private stateManager: ExplorerStateManager;
  private destinationId: string;
  private configEditor!: CodeEditorCSS;
  private outputContainer?: HTMLDivElement;
  private outputContent?: HTMLPreElement;
  private unsubscribe?: () => void;

  constructor(
    container: HTMLElement | string,
    stateManager: ExplorerStateManager,
    destinationId: string,
    options: DestinationInitOptions = {},
  ) {
    // Set default options first
    const defaultOptions = {
      custom: options.custom || {},
      height: options.height || '200px',
      showOutput: options.showOutput !== undefined ? options.showOutput : true,
      label: options.label || 'Configuration',
      theme: options.theme || 'light',
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
    const mainContainer = this.createContainer('destination-init-container', {
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      padding: '16px',
      border: '1px solid #e5e7eb',
      borderRadius: '8px',
      backgroundColor: this.options.theme === 'dark' ? '#1f2937' : '#ffffff',
    });

    // Header
    const header = this.createContainer('destination-init-header', {
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
        fontSize: '16px',
        fontWeight: '600',
        color: this.options.theme === 'dark' ? '#f3f4f6' : '#1f2937',
      },
    );
    title.textContent = this.options.label;

    header.appendChild(title);

    // Config editor container
    const editorContainer = this.createContainer('destination-init-editor');

    // Create config editor
    const configEditorContainer = this.createElement('div');
    this.configEditor = new CodeEditorCSS(configEditorContainer, {
      language: 'json',
      height: this.options.height,
      value: this.getInitialConfigValue(),
      showCopyButton: true,
      theme: this.options.theme,
      onChange: (value) => this.handleConfigChange(value),
    });

    editorContainer.appendChild(configEditorContainer);

    // Output container
    if (this.options.showOutput) {
      this.outputContainer = this.createContainer('destination-init-output', {
        marginTop: '16px',
      });

      const outputHeader = this.createElement(
        'h4',
        {},
        {
          margin: '0 0 8px 0',
          fontSize: '14px',
          fontWeight: '500',
          color: this.options.theme === 'dark' ? '#d1d5db' : '#6b7280',
        },
      );
      outputHeader.textContent = 'Initialization Result';

      this.outputContent = this.createElement(
        'pre',
        { class: 'destination-init-output-content' },
        {
          margin: '0',
          padding: '12px',
          fontSize: '13px',
          fontFamily:
            'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
          backgroundColor:
            this.options.theme === 'dark' ? '#111827' : '#f9fafb',
          border: '1px solid #e5e7eb',
          borderRadius: '6px',
          overflow: 'auto',
          maxHeight: '200px',
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
    mainContainer.appendChild(editorContainer);

    if (this.outputContainer) {
      mainContainer.appendChild(this.outputContainer);
    }

    root.appendChild(mainContainer);
  }

  private getInitialConfigValue(): string {
    let configValue: WalkerOS.AnyObject;

    if (typeof this.options.custom === 'string') {
      try {
        configValue = JSON.parse(this.options.custom);
      } catch (error) {
        console.error('Invalid JSON in custom config:', error);
        configValue = {};
      }
    } else {
      configValue = this.options.custom || {};
    }

    // Merge with current state config
    const currentState = this.stateManager.getState(this.destinationId);
    if (currentState) {
      configValue = { ...currentState.config, ...configValue };
    }

    return JSON.stringify(configValue, null, 2);
  }

  private handleConfigChange(configString: string): void {
    try {
      const config = JSON.parse(configString);
      this.stateManager.updateConfig(this.destinationId, config);
    } catch (error) {
      // Invalid JSON - don't update state but show error in output
      if (this.outputContent) {
        this.outputContent.textContent = `Configuration Error: ${(error as Error).message}`;
        this.outputContent.style.color = '#dc2626';
      }
    }
  }

  private setupStateSubscription(): void {
    this.unsubscribe = this.stateManager.subscribe(
      this.destinationId,
      (state) => {
        this.updateOutput(state);
      },
    );
  }

  private updateFromState(): void {
    const state = this.stateManager.getState(this.destinationId);
    if (state) {
      this.updateOutput(state);
    }
  }

  private updateOutput(state: DestinationState): void {
    if (!this.outputContent) return;

    if (state.error) {
      this.outputContent.textContent = `Error: ${state.error.message}`;
      this.outputContent.style.color = '#dc2626';
      return;
    }

    // Show initialization result
    let output = '';

    if (state.initResult !== undefined) {
      if (typeof state.initResult === 'string') {
        output = state.initResult;
      } else {
        try {
          output = JSON.stringify(state.initResult, null, 2);
        } catch (error) {
          output = String(state.initResult);
        }
      }
    } else {
      output = 'Destination initialized successfully (no return value)';
    }

    this.outputContent.textContent = output;
    this.outputContent.style.color =
      this.options.theme === 'dark' ? '#f3f4f6' : '#1f2937';
  }

  private getStyles(): string {
    return `
      .destination-init-container {
        font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif;
      }
      
      .destination-init-output-content {
        transition: all 0.2s ease;
      }
      
      .destination-init-output-content:empty::before {
        content: "No output yet...";
        color: ${this.options.theme === 'dark' ? '#9ca3af' : '#6b7280'};
        font-style: italic;
      }
    `;
  }

  // Public API methods

  /**
   * Update the configuration
   */
  setConfig(config: WalkerOS.AnyObject): void {
    const configString = JSON.stringify(config, null, 2);
    this.configEditor.setValue(configString);
    this.stateManager.updateConfig(this.destinationId, config);
  }

  /**
   * Get the current configuration
   */
  getConfig(): WalkerOS.AnyObject {
    try {
      return JSON.parse(this.configEditor.getValue());
    } catch (error) {
      console.error('Invalid JSON configuration:', error);
      return {};
    }
  }

  /**
   * Focus the config editor
   */
  focus(): void {
    this.configEditor.focus();
  }

  protected onDestroy(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
    if (this.configEditor) {
      this.configEditor.destroy();
    }
  }
}
