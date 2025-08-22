/**
 * ResultBox Molecule Component
 * Display results with various formats
 */

import type { ResultBoxOptions, ResultBoxAPI } from '../types';
import { createBox } from '../atoms/box';
import { createIconButton } from '../atoms/iconButton';
import { createElement, clearChildren, createShadow } from '../lib/dom';
import { formatValue, formatError } from '../lib/evaluate';
import { highlight } from '../lib/syntax';
import { getCompleteStyles, getStandaloneStyles } from '../styles/theme';

/**
 * Create a result box component
 */
export function createResultBox(
  element: HTMLElement,
  options: ResultBoxOptions = {},
): ResultBoxAPI {
  // Determine if this should be a standalone component (default: true)
  const isStandalone = options.standalone !== false;

  // Create Shadow DOM container if standalone
  let containerElement = element;
  let shadowRoot: ShadowRoot | undefined;

  if (isStandalone) {
    const { shadow, container } = createShadow(element);
    shadowRoot = shadow;
    containerElement = container;

    // Inject standalone styles for standalone usage
    const styles = document.createElement('style');
    styles.textContent = getStandaloneStyles();
    shadow.appendChild(styles);
  }

  let currentType = options.type || 'value';
  let logs: string[] = [];

  // Create base box
  const box = createBox(containerElement, {
    label: options.label || 'Result',
    showHeader: true,
    showFooter: false,
    className: 'elb-result-box',
  });

  // Create result display area
  const display = createElement('div', { class: 'elb-result-display' });
  box.getContent().appendChild(display);

  // Add actions to header if requested
  if (options.showActions && box.getHeader()) {
    const controls = createElement('div', { class: 'elb-result-box-controls' });

    // Copy button only
    const copyBtn = createIconButton(controls, {
      icon: 'copy',
      tooltip: 'Copy output',
      onClick: async () => {
        const content = display.textContent || '';
        try {
          await navigator.clipboard.writeText(content);

          // Visual feedback
          copyBtn.setIcon('check');
          copyBtn.setTooltip('Copied!');
          setTimeout(() => {
            copyBtn.setIcon('copy');
            copyBtn.setTooltip('Copy output');
          }, 2000);

          options.onCopy?.();
        } catch (e) {
          console.error('Failed to copy:', e);
        }
      },
    });

    box.getHeader()!.appendChild(controls);
  }

  // Helper functions
  const clearDisplay = () => {
    clearChildren(display);
    logs = [];
  };

  const renderValue = (value: unknown) => {
    clearDisplay();

    switch (currentType) {
      case 'error':
        renderError(value);
        break;
      case 'log':
        renderLogs();
        break;
      case 'html':
        renderHTML(value);
        break;
      case 'table':
        renderTable(value);
        break;
      case 'value':
      default:
        renderJSON(value);
        break;
    }
  };

  const renderJSON = (value: unknown) => {
    const formatted = formatValue(value);
    const highlighted = highlight(formatted, 'json');

    const pre = createElement('pre', { class: 'elb-result-json' });
    const code = createElement('code');
    code.innerHTML = highlighted;
    pre.appendChild(code);
    display.appendChild(pre);
  };

  const renderError = (value: unknown) => {
    const errorText =
      value instanceof Error ? formatError(value) : String(value);
    const errorDiv = createElement(
      'div',
      { class: 'elb-result-error' },
      errorText,
    );
    display.appendChild(errorDiv);
  };

  const renderLogs = () => {
    const logsDiv = createElement('div', { class: 'elb-result-logs' });
    logs.forEach((log) => {
      const logLine = createElement(
        'div',
        { class: 'elb-result-log-line' },
        log,
      );
      logsDiv.appendChild(logLine);
    });
    display.appendChild(logsDiv);
  };

  const renderHTML = (value: unknown) => {
    const htmlContainer = createElement('div', { class: 'elb-result-html' });
    htmlContainer.innerHTML = String(value);
    display.appendChild(htmlContainer);
  };

  const renderTable = (value: unknown) => {
    if (!Array.isArray(value) || value.length === 0) {
      renderJSON(value);
      return;
    }

    const table = createElement('table', { class: 'elb-result-table' });

    // Header
    const thead = createElement('thead');
    const headerRow = createElement('tr');
    const firstItem = value[0];

    if (typeof firstItem === 'object' && firstItem !== null) {
      Object.keys(firstItem).forEach((key) => {
        const th = createElement('th', {}, key);
        headerRow.appendChild(th);
      });
    }
    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Body
    const tbody = createElement('tbody');
    value.forEach((item) => {
      const row = createElement('tr');
      if (typeof item === 'object' && item !== null) {
        Object.values(item).forEach((val) => {
          const td = createElement('td', {}, String(val));
          row.appendChild(td);
        });
      }
      tbody.appendChild(row);
    });
    table.appendChild(tbody);

    display.appendChild(table);
  };

  // Inject styles
  injectResultBoxStyles(element);

  // Initial render if value provided
  if (options.value !== undefined) {
    renderValue(options.value);
  }

  // API
  return {
    setValue: (value: unknown) => {
      currentType = 'value';
      renderValue(value);
    },

    setError: (error: Error | string) => {
      currentType = 'error';
      renderValue(error);
    },

    addLog: (message: string) => {
      logs.push(message);
      if (currentType === 'log') {
        renderLogs();
      }
    },

    clear: () => {
      clearDisplay();
    },

    setType: (type: ResultBoxOptions['type']) => {
      currentType = type || 'value';
    },

    destroy: () => {
      box.destroy();
    },
  };
}

/**
 * Inject result box styles
 */
function injectResultBoxStyles(element: HTMLElement): void {
  const root = element.getRootNode();
  const target = root instanceof ShadowRoot ? root : document.head;

  if (target.querySelector('#elb-result-box-styles')) return;

  const styles = `
    .elb-result-box .elb-box-content {
      font-family: var(--elb-font-mono);
      font-size: var(--elb-font-size-sm);
    }
    
    .elb-result-box-controls {
      display: flex;
      gap: var(--elb-spacing-xs);
      margin-left: auto;
    }
    
    .elb-result-box .elb-box-header {
      padding-right: var(--elb-spacing-xs);
    }
    
    .elb-result-display {
      width: 100%;
      height: 100%;
      overflow: auto;
    }
    
    .elb-result-json {
      margin: 0;
      padding: 0;
      white-space: pre-wrap;
      word-break: break-all;
    }
    
    .elb-result-error {
      color: var(--elb-error);
      white-space: pre-wrap;
    }
    
    .elb-result-logs {
      display: flex;
      flex-direction: column;
      gap: var(--elb-spacing-xs);
    }
    
    .elb-result-log-line {
      padding: var(--elb-spacing-xs);
      border-left: 3px solid var(--elb-accent);
      background: var(--elb-border);
    }
    
    .elb-result-html {
      padding: var(--elb-spacing-sm);
    }
    
    .elb-result-table {
      width: 100%;
      border-collapse: collapse;
    }
    
    .elb-result-table th,
    .elb-result-table td {
      padding: var(--elb-spacing-xs) var(--elb-spacing-sm);
      border: 1px solid var(--elb-border);
      text-align: left;
    }
    
    .elb-result-table th {
      background: var(--elb-border);
      font-weight: 600;
    }
  `;

  const styleElement = createElement(
    'style',
    { id: 'elb-result-box-styles' },
    styles,
  );
  target.appendChild(styleElement);
}
