/**
 * MultiColumnLayout - Reusable multi-column layout component
 *
 * Features:
 * - Configurable column count and titles
 * - Unified styling with existing explorer components
 * - Shadow DOM support for CSS isolation
 * - Consistent theming and layout behavior
 * - Based on proven LiveCodeBase architecture
 */

import { createComponent, type ComponentAPI } from './Component';
import {
  createUnifiedContainer,
  type UnifiedContainerAPI,
} from './UnifiedContainer';
import { createElement, injectComponentCSS } from '../utils/dom';

export interface ColumnConfig {
  title: string;
  className?: string;
  contentClassName?: string;
}

export interface MultiColumnLayoutOptions {
  columns: ColumnConfig[];
  layout?: 'horizontal' | 'vertical';
  height?: string;
  showHeader?: boolean;
  title?: string;
  useShadowDOM?: boolean;
  gap?: string;
}

export interface MultiColumnLayoutAPI extends ComponentAPI {
  getColumnElement(index: number): HTMLElement | null;
  getColumnContentElement(index: number): HTMLElement | null;
  setLayout(layout: 'horizontal' | 'vertical'): void;
  getLayout(): string;
}

const MULTI_COLUMN_CSS = `
/* Multi-Column Layout Component Styles */
.explorer-multi-column-layout {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: transparent;
  overflow: hidden;
}

.explorer-multi-column-layout__content {
  display: grid;
  flex: 1;
  gap: var(--column-gap, 16px);
  height: 100%;
  min-height: 0;
}

.explorer-multi-column-layout__content--horizontal {
  grid-auto-flow: column;
  grid-auto-columns: 1fr;
}

.explorer-multi-column-layout__content--vertical {
  grid-auto-flow: row;
  grid-auto-rows: 1fr;
}

/* Responsive design */
@media (max-width: 1024px) {
  .explorer-multi-column-layout__content--horizontal {
    grid-auto-flow: row;
    grid-auto-rows: minmax(300px, 1fr);
    gap: 12px;
  }
}

@media (max-width: 768px) {
  .explorer-multi-column-layout__content {
    gap: 8px;
  }
}
`;

/**
 * Create a multi-column layout component
 */
export function createMultiColumnLayout(
  elementOrSelector: HTMLElement | string,
  options: MultiColumnLayoutOptions,
): {
  api: MultiColumnLayoutAPI;
  contentElement: HTMLElement;
  columnContainers: UnifiedContainerAPI[];
  cleanup: Array<() => void>;
} {
  const { columns, layout = 'horizontal', gap = '16px' } = options;

  if (!columns || columns.length === 0) {
    throw new Error(
      'MultiColumnLayout requires at least one column configuration',
    );
  }

  // Create base component
  const baseComponent = createComponent(elementOrSelector, {
    autoMount: false,
    useShadowDOM: options.useShadowDOM || false,
  });

  const element = baseComponent.getElement()!;
  const shadowRoot = baseComponent.getShadowRoot();
  const contentRoot = baseComponent.getContentRoot() as HTMLElement;

  // Add classes for styling
  element.classList.add('explorer-multi-column-layout');
  contentRoot.classList.add('explorer-multi-column-layout');

  // Component state
  let currentLayout = layout;
  const columnContainers: UnifiedContainerAPI[] = [];
  const cleanupFunctions: Array<() => void> = [];

  /**
   * Inject layout CSS styles
   */
  function injectStyles(): void {
    const css = MULTI_COLUMN_CSS;

    if (shadowRoot) {
      injectComponentCSS(
        css,
        'explorer-multi-column-layout-styles',
        shadowRoot,
      );
    } else {
      injectComponentCSS(css, 'explorer-multi-column-layout-styles');
    }
  }

  /**
   * Create the column structure
   */
  function createColumns(): HTMLElement {
    const contentElement = createElement('div', {
      className: `explorer-multi-column-layout__content explorer-multi-column-layout__content--${currentLayout}`,
    });

    // Set CSS custom property for gap
    contentElement.style.setProperty('--column-gap', gap);

    // Create each column
    columns.forEach((columnConfig, index) => {
      const container = createUnifiedContainer({
        className: `explorer-multi-column-layout__column ${columnConfig.className || ''}`,
        contentClassName: columnConfig.contentClassName,
        showHeader: true,
        headerOptions: {
          title: columnConfig.title,
        },
        shadowRoot: shadowRoot,
      });

      columnContainers.push(container);
      contentElement.appendChild(container.getElement());
    });

    return contentElement;
  }

  /**
   * Initialize the layout
   */
  function initialize(): HTMLElement {
    injectStyles();
    const contentElement = createColumns();
    contentRoot.appendChild(contentElement);
    return contentElement;
  }

  // Create the layout
  const contentElement = initialize();

  // Enhanced API
  const api: MultiColumnLayoutAPI = {
    ...baseComponent,

    getColumnElement(index: number): HTMLElement | null {
      if (index < 0 || index >= columnContainers.length) {
        return null;
      }
      return columnContainers[index].getElement();
    },

    getColumnContentElement(index: number): HTMLElement | null {
      if (index < 0 || index >= columnContainers.length) {
        return null;
      }
      return columnContainers[index].getContentElement();
    },

    setLayout(newLayout: 'horizontal' | 'vertical'): void {
      if (newLayout === currentLayout) return;

      currentLayout = newLayout;
      const content = contentRoot.querySelector(
        '.explorer-multi-column-layout__content',
      );
      if (content) {
        content.className = `explorer-multi-column-layout__content explorer-multi-column-layout__content--${currentLayout}`;
      }
    },

    getLayout(): string {
      return currentLayout;
    },

    destroy(): void {
      // Cleanup column containers
      columnContainers.forEach((container) => {
        container.destroy?.();
      });

      // Run cleanup functions
      cleanupFunctions.forEach((fn) => fn());

      // Destroy base component
      baseComponent.destroy();
    },
  };

  return {
    api,
    contentElement,
    columnContainers,
    cleanup: cleanupFunctions,
  };
}
