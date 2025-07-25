/**
 * LiveCode Base - Shared functionality for LiveCode components
 *
 * Provides common layout, styling, and lifecycle management
 * for both LiveCodeHTML and LiveCodeJS components.
 */

import { createComponent, type ComponentAPI } from './Component';
import { createElement, addEventListener, injectCSS } from '../utils/dom';

export interface LiveCodeBaseOptions {
  layout?: 'horizontal' | 'vertical';
  height?: string;
  showHeader?: boolean;
  title?: string;
}

export interface LiveCodeBaseAPI extends ComponentAPI {
  setLayout(layout: 'horizontal' | 'vertical'): void;
  getLayout(): string;
}

/**
 * Create the base LiveCode component structure
 */
export function createLiveCodeBase(
  elementOrSelector: HTMLElement | string,
  options: LiveCodeBaseOptions = {},
): {
  api: LiveCodeBaseAPI;
  contentElement: HTMLElement;
  cleanup: Array<() => void>;
} {
  const baseComponent = createComponent(elementOrSelector, {
    autoMount: false,
  });

  const element = baseComponent.getElement()!;
  element.classList.add('explorer-livecode-base');

  // Component state
  let currentLayout = options.layout || 'horizontal';

  // Cleanup functions
  const cleanupFunctions: Array<() => void> = [];

  /**
   * Inject base LiveCode CSS styles
   */
  function injectStyles(): void {
    const css = `
/* LiveCode Base Component Styles */
.explorer-livecode-base {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--explorer-bg-primary, #ffffff);
  border: 1px solid var(--explorer-border-primary, #e5e7eb);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
}

.explorer-livecode-base__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: var(--explorer-bg-secondary, #f9fafb);
  border-bottom: 1px solid var(--explorer-border-primary, #e5e7eb);
  border-radius: 12px 12px 0 0;
}

.explorer-livecode-base__title {
  font-weight: 600;
  color: var(--explorer-text-primary, #111827);
  font-size: 14px;
}

.explorer-livecode-base__actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.explorer-livecode-base__layout-toggle {
  background: none;
  border: 1px solid var(--explorer-border-primary, #e5e7eb);
  color: var(--explorer-text-secondary, #6b7280);
  cursor: pointer;
  padding: 6px 8px;
  border-radius: 6px;
  font-size: 14px;
  transition: all 0.2s ease;
}

.explorer-livecode-base__layout-toggle:hover {
  background: var(--explorer-interactive-hover, #f3f4f6);
  color: var(--explorer-text-primary, #111827);
}

.explorer-livecode-base__content {
  flex: 1;
  display: flex;
  overflow: hidden;
}

/* Horizontal Layout */
.explorer-livecode-base--horizontal .explorer-livecode-base__content {
  flex-direction: row;
}

/* Vertical Layout */
.explorer-livecode-base--vertical .explorer-livecode-base__content {
  flex-direction: column;
}

.explorer-livecode-base__panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.explorer-livecode-base__panel + .explorer-livecode-base__panel {
  border-left: 1px solid var(--explorer-border-primary, #e5e7eb);
}

.explorer-livecode-base--vertical .explorer-livecode-base__panel + .explorer-livecode-base__panel {
  border-left: none;
  border-top: 1px solid var(--explorer-border-primary, #e5e7eb);
}

.explorer-livecode-base__panel-header {
  padding: 8px 12px;
  background: var(--explorer-bg-tertiary, #f9fafb);
  border-bottom: 1px solid var(--explorer-border-primary, #e5e7eb);
  font-size: 12px;
  font-weight: 600;
  color: var(--explorer-text-secondary, #6b7280);
}

.explorer-livecode-base__panel-content {
  flex: 1;
  overflow: hidden;
}

/* Responsive design */
@media (max-width: 768px) {
  .explorer-livecode-base--horizontal .explorer-livecode-base__content {
    flex-direction: column;
  }
  
  .explorer-livecode-base--horizontal .explorer-livecode-base__panel + .explorer-livecode-base__panel {
    border-left: none;
    border-top: 1px solid var(--explorer-border-primary, #e5e7eb);
  }
  
  .explorer-livecode-base__header {
    padding: 8px 12px;
  }
}
`;

    injectCSS(css, 'explorer-livecode-base-styles');
  }

  /**
   * Create the DOM structure
   */
  function createDOM(): HTMLElement {
    element.innerHTML = '';
    element.classList.add(`explorer-livecode-base--${currentLayout}`);

    // Set height if provided
    if (options.height) {
      element.style.height = options.height;
    }

    // Create header (optional)
    if (options.showHeader !== false) {
      const header = createElement('div', {
        className: 'explorer-livecode-base__header',
      });

      const title = createElement('div', {
        className: 'explorer-livecode-base__title',
        textContent: options.title || 'LiveCode',
      });

      const actions = createElement('div', {
        className: 'explorer-livecode-base__actions',
      });

      // Layout toggle
      const layoutToggle = createElement('button', {
        className: 'explorer-livecode-base__layout-toggle',
        innerHTML: getLayoutIcon(currentLayout),
        title: 'Toggle layout',
      }) as HTMLButtonElement;

      const onLayoutToggle = () => {
        const newLayout =
          currentLayout === 'horizontal' ? 'vertical' : 'horizontal';
        api.setLayout(newLayout);
      };

      cleanupFunctions.push(
        addEventListener(layoutToggle, 'click', onLayoutToggle),
      );

      actions.appendChild(layoutToggle);
      header.appendChild(title);
      header.appendChild(actions);
      element.appendChild(header);
    }

    // Create content container
    const content = createElement('div', {
      className: 'explorer-livecode-base__content',
    });

    element.appendChild(content);
    return content;
  }

  /**
   * Get layout icon
   */
  function getLayoutIcon(layout: string): string {
    switch (layout) {
      case 'horizontal':
        return '⟷';
      case 'vertical':
        return '↕';
      default:
        return '⟷';
    }
  }

  // Enhanced API
  const api: LiveCodeBaseAPI = {
    ...baseComponent,

    setLayout(layout: 'horizontal' | 'vertical'): void {
      currentLayout = layout;

      // Update element classes
      element.className = element.className.replace(
        /explorer-livecode-base--\w+/,
        '',
      );
      element.classList.add(`explorer-livecode-base--${layout}`);

      // Update layout icon
      const layoutToggle = element.querySelector(
        '.explorer-livecode-base__layout-toggle',
      );
      if (layoutToggle) {
        layoutToggle.innerHTML = getLayoutIcon(layout);
      }
    },

    getLayout(): string {
      return currentLayout;
    },

    destroy(): void {
      cleanupFunctions.forEach((cleanup) => cleanup());
      cleanupFunctions.length = 0;
      baseComponent.destroy();
    },
  };

  // Initialize component
  injectStyles();
  const contentElement = createDOM();

  return {
    api,
    contentElement,
    cleanup: cleanupFunctions,
  };
}
