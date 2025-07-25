/**
 * LiveCode Base - Shared functionality for LiveCode components
 *
 * Provides common layout, styling, and lifecycle management
 * for both LiveCodeHTML and LiveCodeJS components.
 */

import { createComponent, type ComponentAPI } from './Component';
import {
  createElement,
  addEventListener,
  injectComponentCSS,
} from '../utils/dom';

export interface LiveCodeBaseOptions {
  layout?: 'horizontal' | 'vertical';
  height?: string;
  showHeader?: boolean;
  title?: string;
  useShadowDOM?: boolean;
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
    useShadowDOM: options.useShadowDOM || false,
  });

  const element = baseComponent.getElement()!;
  const shadowRoot = baseComponent.getShadowRoot();
  const contentRoot = baseComponent.getContentRoot() as HTMLElement;

  // Add class to both host element (for tests/API) and content root (for styling)
  element.classList.add('explorer-livecode-base');
  contentRoot.classList.add('explorer-livecode-base');

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
  background: transparent;
  /* Removed border - individual boxes have their own borders */
  overflow: hidden;
  /* Removed border-radius and box-shadow - not needed on parent container */
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
  gap: 8px;
  padding: 8px;
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

/* Removed margin-left approach - now using flex gap */
/* Individual panels get their own borders through unified container system */

.explorer-livecode-base__panel-header {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  background: var(--explorer-bg-tertiary, #f9fafb);
  border-bottom: 1px solid var(--explorer-border-primary, #e5e7eb);
  font-size: 12px;
  font-weight: 600;
  color: var(--explorer-text-secondary, #6b7280);
}

.explorer-livecode-base__clear-btn {
  background: none;
  border: 1px solid var(--explorer-border-primary, #e5e7eb);
  color: var(--explorer-text-secondary, #6b7280);
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 10px;
  margin-left: auto;
  transition: all 0.2s ease;
}

.explorer-livecode-base__clear-btn:hover {
  background: var(--explorer-interactive-hover, #f3f4f6);
  color: var(--explorer-text-primary, #111827);
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
  
  .explorer-livecode-base__content {
    padding: 6px;
    gap: 6px;
  }
  
  .explorer-livecode-base__header {
    padding: 8px 12px;
  }
}
`;

    // Use shadow DOM-aware CSS injection
    injectComponentCSS(
      css,
      'explorer-livecode-base-styles',
      shadowRoot,
      '.explorer-livecode-base',
    );
  }

  /**
   * Create the DOM structure
   */
  function createDOM(): HTMLElement {
    contentRoot.innerHTML = '';
    // Add layout class to both host element (for tests/API) and content root (for styling)
    element.classList.add(`explorer-livecode-base--${currentLayout}`);
    contentRoot.classList.add(`explorer-livecode-base--${currentLayout}`);

    // Set height if provided
    if (options.height) {
      contentRoot.style.height = options.height;
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
      contentRoot.appendChild(header);
    }

    // Create content container
    const content = createElement('div', {
      className: 'explorer-livecode-base__content',
    });

    contentRoot.appendChild(content);
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

      // Update classes on both host element and content root
      element.className = element.className.replace(
        /explorer-livecode-base--\w+/,
        '',
      );
      element.classList.add(`explorer-livecode-base--${layout}`);

      contentRoot.className = contentRoot.className.replace(
        /explorer-livecode-base--\w+/,
        '',
      );
      contentRoot.classList.add(`explorer-livecode-base--${layout}`);

      // Update layout icon
      const layoutToggle = contentRoot.querySelector(
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
