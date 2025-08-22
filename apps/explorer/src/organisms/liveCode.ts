/**
 * LiveCode Organism Component
 * Interactive code execution with live results
 */

import type {
  LiveCodeOptions,
  LiveCodeAPI,
  ControlPanelAPI,
  OverlayAPI,
} from '../types';
import { createColumns } from '../layouts/columns';
import { createCodeBox } from '../molecules/codeBox';
import { createResultBox } from '../molecules/resultBox';
import { createControlPanel } from '../molecules/controlPanel';
import { createIconButton } from '../atoms/iconButton';
import { createOverlay } from '../atoms/overlay';
import { createShadow, createElement } from '../lib/dom';
import { getCompleteStyles } from '../styles/theme';
import { injectGlobalThemeStyles } from '../styles/globalTheme';
import { parseInput } from '../lib/evaluate';
import { debounce } from '../lib/debounce';

/**
 * Create a LiveCode component
 */
export function createLiveCode(
  element: HTMLElement,
  options: LiveCodeOptions = {},
): LiveCodeAPI {
  // Inject global theme styles once (into document head)
  injectGlobalThemeStyles();

  const { shadow, container } = createShadow(element);

  // Inject complete styles with text size option (includes box styles)
  const styles = document.createElement('style');
  styles.textContent =
    getCompleteStyles(options.textSize) + getLiveCodeStyles();
  shadow.appendChild(styles);

  // Create layout
  const layout = createColumns(container, {
    columns: 2,
    direction: options.layout === 'vertical' ? 'vertical' : 'horizontal',
    responsive: options.layout === 'auto',
    gap: 'var(--elb-spacing-md)',
  });

  // Create control panel if requested
  let controlPanel: ControlPanelAPI | undefined;
  let overlay: OverlayAPI | undefined;

  if (options.showControls) {
    // Create overlay for fullscreen if enabled
    if (options.fullscreen !== false) {
      overlay = createOverlay({
        onClose: () => {
          // Re-append container to original element
          shadow.appendChild(container);
        },
      });
    }

    // Create wrapper div for control panel that goes above the layout
    const controlWrapper = createElement('div', {
      class: 'elb-control-wrapper',
    });
    container.insertBefore(controlWrapper, container.firstChild);

    controlPanel = createControlPanel(controlWrapper, {
      visible: true,
      defaultLayout: options.layout === 'vertical' ? 'rows' : 'columns',
      showLayoutButtons: true,
      showFullscreen: options.fullscreen !== false,
      showGrid: false,
      onLayoutChange: (newLayout) => {
        if (newLayout === 'columns' || newLayout === 'rows') {
          layout.setDirection(newLayout === 'rows' ? 'vertical' : 'horizontal');
        }
      },
      onFullscreen: () => {
        if (overlay) {
          overlay.open(container);
        }
      },
    });
  }

  // Create input code box
  const inputBox = createCodeBox(layout.getColumn(0), {
    label: options.labelInput || 'Input',
    value: options.input || '',
    language: 'javascript',
    lineNumbers:
      options.lineNumbers !== undefined ? options.lineNumbers : false, // Default false
    showControls: true,
    onChange: debounce(() => executeCode(), options.debounceDelay || 300),
    standalone: false, // Use parent's Shadow DOM
  });

  // Create output result box
  const outputBox = createResultBox(layout.getColumn(1), {
    label: options.labelOutput || 'Output',
    value: options.output,
    showActions: true,
    standalone: false, // Use parent's Shadow DOM
  });

  // Context for code execution
  let context = options.context || {};

  // Execute code function
  async function executeCode() {
    const code = inputBox.getValue();

    // Clear previous output
    outputBox.clear();

    try {
      // Execute with context using unified parseInput approach (return value mode)
      const result = await parseInput(code, context, true);

      // Show the result directly
      if (result !== undefined) {
        outputBox.setValue(result);
      }
    } catch (error) {
      outputBox.setError(
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  }

  // Set height if provided
  if (options.height) {
    container.style.height = options.height;
  }

  // Initial execution if input provided
  if (options.input) {
    executeCode();
  }

  // API
  return {
    getInput: () => inputBox.getValue(),

    setInput: (value: string) => {
      inputBox.setValue(value);
      executeCode();
    },

    getOutput: () => {
      // Not directly accessible from resultBox API
      // Would need to track last result
      return undefined;
    },

    execute: () => executeCode(),

    setContext: (newContext: Record<string, unknown>) => {
      context = newContext;
      executeCode();
    },

    destroy: () => {
      inputBox.destroy();
      outputBox.destroy();
      layout.destroy();
      if (controlPanel) controlPanel.destroy();
      if (overlay) overlay.destroy();
      shadow.innerHTML = '';
      element.remove();
    },
  };
}

/**
 * LiveCode-specific styles
 */
function getLiveCodeStyles(): string {
  return `
    .elb-explorer-root {
      display: flex;
      flex-direction: column;
      height: 100%;
      min-height: 200px;
      background: transparent;
    }
    
    /* Ensure boxes fill their columns */
    .elb-layout-column > * {
      height: 100%;
    }
    
    /* Responsive adjustments */
    @media (max-width: 767px) {
      .elb-explorer-root {
        min-height: 400px;
      }
      
      .elb-layout-column {
        min-height: 200px;
      }
    }
  `;
}
