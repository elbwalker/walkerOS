/**
 * UnifiedHeader - Consistent header component for all explorer boxes
 *
 * Features:
 * - Unified styling across all components
 * - Callback-driven button visibility (no separate flags)
 * - Flexible button configuration
 * - Theme-aware styling
 * - Consistent spacing and layout
 */

import {
  createElement,
  addEventListener,
  injectComponentCSS,
} from '../utils/dom';

export interface HeaderButton {
  text: string;
  callback: () => void;
  className?: string;
  title?: string;
}

export interface UnifiedHeaderOptions {
  title: string;
  onClear?: () => void;
  onCopy?: () => void;
  onRefresh?: () => void;
  customButtons?: HeaderButton[];
  className?: string;
  shadowRoot?: ShadowRoot | null;
}

export interface UnifiedHeaderAPI {
  getElement(): HTMLElement;
  setTitle(title: string): void;
  updateButtons(options: Partial<UnifiedHeaderOptions>): void;
  destroy(): void;
}

/**
 * Create a unified header component
 */
export function createUnifiedHeader(
  options: UnifiedHeaderOptions,
): UnifiedHeaderAPI {
  let currentTitle = options.title;
  let headerElement: HTMLElement;
  let titleElement: HTMLElement;
  let actionsElement: HTMLElement;
  const cleanupFunctions: Array<() => void> = [];
  const shadowRoot = options.shadowRoot || null;

  /**
   * Inject unified header CSS styles
   */
  function injectStyles(): void {
    const css = `
/* UnifiedHeader Component Styles */
.explorer-unified-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: var(--explorer-bg-tertiary, #f9fafb);
  border-bottom: 1px solid var(--explorer-border-primary, #e5e7eb);
  font-size: 12px;
  font-weight: 600;
  color: var(--explorer-text-secondary, #6b7280);
  min-height: 32px;
  box-sizing: border-box;
}

.explorer-unified-header__title {
  flex: 1;
  color: var(--explorer-text-secondary, #6b7280);
  font-weight: 600;
  font-size: 12px;
  margin: 0;
  padding: 0;
}

.explorer-unified-header__actions {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-left: auto;
}

.explorer-unified-header__btn {
  background: none;
  border: 1px solid var(--explorer-border-primary, #e5e7eb);
  color: var(--explorer-text-secondary, #6b7280);
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 10px;
  font-weight: 500;
  transition: all 0.2s ease;
  line-height: 1.2;
  min-width: auto;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.explorer-unified-header__btn:hover {
  background: var(--explorer-interactive-hover, #f3f4f6);
  color: var(--explorer-text-primary, #111827);
  border-color: var(--explorer-border-secondary, #d1d5db);
}

.explorer-unified-header__btn:active {
  background: var(--explorer-interactive-active, #e5e7eb);
}

.explorer-unified-header__btn--clear {
  /* Specific styling for clear button if needed */
}

.explorer-unified-header__btn--copy {
  /* Specific styling for copy button if needed */
}

.explorer-unified-header__btn--refresh {
  /* Specific styling for refresh button if needed */
}

/* Responsive design */
@media (max-width: 768px) {
  .explorer-unified-header {
    padding: 6px 10px;
    min-height: 28px;
  }
  
  .explorer-unified-header__btn {
    padding: 1px 4px;
    font-size: 9px;
    height: 18px;
  }
}
`;

    // Use shadow DOM-aware CSS injection
    injectComponentCSS(
      css,
      'explorer-unified-header-styles',
      shadowRoot,
      '.explorer-unified-header',
    );
  }

  /**
   * Create header buttons based on options
   */
  function createButtons(opts: UnifiedHeaderOptions): HTMLElement[] {
    const buttons: HTMLElement[] = [];

    // Clear button (show if onClear callback exists)
    if (opts.onClear) {
      const clearBtn = createElement('button', {
        className:
          'explorer-unified-header__btn explorer-unified-header__btn--clear',
        textContent: 'Clear',
        title: 'Clear content',
      }) as HTMLButtonElement;

      cleanupFunctions.push(addEventListener(clearBtn, 'click', opts.onClear));
      buttons.push(clearBtn);
    }

    // Copy button (show if onCopy callback exists)
    if (opts.onCopy) {
      const copyBtn = createElement('button', {
        className:
          'explorer-unified-header__btn explorer-unified-header__btn--copy',
        textContent: '📋',
        title: 'Copy content',
      }) as HTMLButtonElement;

      cleanupFunctions.push(addEventListener(copyBtn, 'click', opts.onCopy));
      buttons.push(copyBtn);
    }

    // Refresh button (show if onRefresh callback exists)
    if (opts.onRefresh) {
      const refreshBtn = createElement('button', {
        className:
          'explorer-unified-header__btn explorer-unified-header__btn--refresh',
        textContent: '🔄',
        title: 'Refresh',
      }) as HTMLButtonElement;

      cleanupFunctions.push(
        addEventListener(refreshBtn, 'click', opts.onRefresh),
      );
      buttons.push(refreshBtn);
    }

    // Custom buttons
    if (opts.customButtons) {
      opts.customButtons.forEach((buttonConfig) => {
        const customBtn = createElement('button', {
          className: `explorer-unified-header__btn ${buttonConfig.className || ''}`,
          textContent: buttonConfig.text,
          title: buttonConfig.title || buttonConfig.text,
        }) as HTMLButtonElement;

        cleanupFunctions.push(
          addEventListener(customBtn, 'click', buttonConfig.callback),
        );
        buttons.push(customBtn);
      });
    }

    return buttons;
  }

  /**
   * Create the DOM structure
   */
  function createDOM(): HTMLElement {
    headerElement = createElement('div', {
      className: `explorer-unified-header ${options.className || ''}`,
    });

    titleElement = createElement('div', {
      className: 'explorer-unified-header__title',
      textContent: currentTitle,
    });

    actionsElement = createElement('div', {
      className: 'explorer-unified-header__actions',
    });

    // Add buttons
    const buttons = createButtons(options);
    buttons.forEach((button) => actionsElement.appendChild(button));

    headerElement.appendChild(titleElement);
    headerElement.appendChild(actionsElement);

    return headerElement;
  }

  /**
   * Update buttons based on new options
   */
  function updateButtons(newOptions: Partial<UnifiedHeaderOptions>): void {
    // Clear existing buttons and cleanup
    actionsElement.innerHTML = '';
    cleanupFunctions.forEach((cleanup) => cleanup());
    cleanupFunctions.length = 0;

    // Create new buttons with merged options
    const mergedOptions = { ...options, ...newOptions };
    const buttons = createButtons(mergedOptions);
    buttons.forEach((button) => actionsElement.appendChild(button));

    // Update stored options
    Object.assign(options, newOptions);
  }

  // Enhanced API
  const api: UnifiedHeaderAPI = {
    getElement(): HTMLElement {
      return headerElement;
    },

    setTitle(title: string): void {
      currentTitle = title;
      titleElement.textContent = title;
    },

    updateButtons(newOptions: Partial<UnifiedHeaderOptions>): void {
      updateButtons(newOptions);
    },

    destroy(): void {
      cleanupFunctions.forEach((cleanup) => cleanup());
      cleanupFunctions.length = 0;
      headerElement?.remove();
    },
  };

  // Initialize component
  injectStyles();
  createDOM();

  return api;
}
