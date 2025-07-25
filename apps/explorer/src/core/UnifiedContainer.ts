/**
 * UnifiedContainer - Consistent container component for all explorer boxes
 *
 * Features:
 * - Unified styling across all components
 * - Individual rounded borders on each box
 * - Consistent spacing and layout
 * - Theme-aware styling
 * - No borders on parent containers
 */

import { createElement, injectCSS } from '../utils/dom';
import {
  createUnifiedHeader,
  type UnifiedHeaderOptions,
  type UnifiedHeaderAPI,
} from './UnifiedHeader';

export interface UnifiedContainerOptions {
  className?: string;
  height?: string;
  showHeader?: boolean;
  headerOptions?: UnifiedHeaderOptions;
  contentClassName?: string;
}

export interface UnifiedContainerAPI {
  getElement(): HTMLElement;
  getContentElement(): HTMLElement;
  getHeader(): UnifiedHeaderAPI | null;
  setHeight(height: string): void;
  destroy(): void;
}

/**
 * Create a unified container component
 */
export function createUnifiedContainer(
  options: UnifiedContainerOptions = {},
): UnifiedContainerAPI {
  let containerElement: HTMLElement;
  let contentElement: HTMLElement;
  let headerAPI: UnifiedHeaderAPI | null = null;

  /**
   * Inject unified container CSS styles
   */
  function injectStyles(): void {
    const css = `
/* UnifiedContainer Component Styles */
.explorer-unified-container {
  display: flex;
  flex-direction: column;
  background: var(--explorer-bg-primary);
  border: 1px solid var(--explorer-border-primary, #e5e7eb);
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
  transition: all 0.2s ease;
}

/* Standalone context - opaque backgrounds */
[data-theme] .explorer-unified-container {
  background: var(--explorer-bg-primary-opaque, var(--explorer-bg-primary));
}

.explorer-unified-container:focus-within {
  border-color: var(--explorer-interactive-primary, #2563eb);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1), 0 1px 3px 0 rgba(0, 0, 0, 0.1);
}

.explorer-unified-container__content {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: transparent;
}

/* Specific container variants */
.explorer-unified-container--code-editor {
  /* Specific styling for code editor containers */
}

.explorer-unified-container--result-display {
  /* Specific styling for result display containers */
}

.explorer-unified-container--preview {
  /* Specific styling for preview containers */
}

.explorer-unified-container--destination {
  /* Specific styling for destination containers */
}

/* Height management */
.explorer-unified-container--fixed-height {
  height: var(--container-height);
}

.explorer-unified-container--flex-height {
  flex: 1;
  min-height: 0;
}

/* Responsive design */
@media (max-width: 768px) {
  .explorer-unified-container {
    border-radius: 6px;
    box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  }
}
`;

    injectCSS(css, 'explorer-unified-container-styles');
  }

  /**
   * Create the DOM structure
   */
  function createDOM(): HTMLElement {
    containerElement = createElement('div', {
      className: `explorer-unified-container ${options.className || ''}`,
    });

    // Set height if provided
    if (options.height) {
      containerElement.style.setProperty('--container-height', options.height);
      containerElement.classList.add(
        'explorer-unified-container--fixed-height',
      );
    } else {
      containerElement.classList.add('explorer-unified-container--flex-height');
    }

    // Create header if requested
    if (options.showHeader && options.headerOptions) {
      headerAPI = createUnifiedHeader(options.headerOptions);
      containerElement.appendChild(headerAPI.getElement());
    }

    // Create content container
    contentElement = createElement('div', {
      className: `explorer-unified-container__content ${options.contentClassName || ''}`,
    });

    containerElement.appendChild(contentElement);

    return containerElement;
  }

  // Enhanced API
  const api: UnifiedContainerAPI = {
    getElement(): HTMLElement {
      return containerElement;
    },

    getContentElement(): HTMLElement {
      return contentElement;
    },

    getHeader(): UnifiedHeaderAPI | null {
      return headerAPI;
    },

    setHeight(height: string): void {
      containerElement.style.setProperty('--container-height', height);
      if (
        !containerElement.classList.contains(
          'explorer-unified-container--fixed-height',
        )
      ) {
        containerElement.classList.remove(
          'explorer-unified-container--flex-height',
        );
        containerElement.classList.add(
          'explorer-unified-container--fixed-height',
        );
      }
    },

    destroy(): void {
      headerAPI?.destroy();
      containerElement?.remove();
    },
  };

  // Initialize component
  injectStyles();
  createDOM();

  return api;
}
