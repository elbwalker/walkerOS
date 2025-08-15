/**
 * Columns Layout Component
 * Multi-column layout with responsive behavior
 */

import type { LayoutOptions, LayoutAPI, ColumnConfig } from '../types';
import { createElement, setStyles, clearChildren } from '../lib/dom';

/**
 * Create a columns layout
 */
export function createColumns(
  container: HTMLElement,
  options: LayoutOptions = {},
): LayoutAPI {
  let direction = options.direction || 'horizontal';
  const columns: HTMLElement[] = [];

  // Create layout container
  const layout = createElement('div', {
    class: `elb-layout elb-layout--${direction} ${options.className || ''}`,
  });

  // Create initial columns
  const columnCount =
    typeof options.columns === 'number'
      ? options.columns
      : options.columns?.length || 2;
  const columnConfigs = Array.isArray(options.columns)
    ? options.columns
    : Array(columnCount).fill({});

  columnConfigs.forEach((config, index) => {
    const column = createColumn(config, index);
    columns.push(column);
    layout.appendChild(column);
  });

  container.appendChild(layout);

  // Apply styles
  applyLayoutStyles(layout, direction, options.gap);

  // Handle responsive behavior
  if (options.responsive) {
    setupResponsive(layout);
  }

  // Inject styles
  injectLayoutStyles(container);

  // Helper functions
  function createColumn(config: ColumnConfig, index: number): HTMLElement {
    const column = createElement('div', {
      class: `elb-layout-column ${config.className || ''}`,
      'data-column': String(index),
    });

    if (config.width) {
      setStyles(column, {
        width:
          typeof config.width === 'number' ? `${config.width}px` : config.width,
        flex: '0 0 auto',
      });
    }

    if (config.minWidth) {
      column.style.minWidth = config.minWidth;
    }

    if (config.maxWidth) {
      column.style.maxWidth = config.maxWidth;
    }

    return column;
  }

  function applyLayoutStyles(layout: HTMLElement, dir: string, gap?: string) {
    setStyles(layout, {
      display: 'flex',
      flexDirection: dir === 'vertical' ? 'column' : 'row',
      gap: gap || 'var(--elb-spacing-md)',
      width: '100%',
      height: '100%',
    });
  }

  function setupResponsive(layout: HTMLElement) {
    const checkBreakpoint = () => {
      const width = window.innerWidth;

      if (width < 768) {
        layout.classList.add('elb-layout--mobile');
        layout.classList.remove('elb-layout--tablet', 'elb-layout--desktop');
      } else if (width < 1024) {
        layout.classList.add('elb-layout--tablet');
        layout.classList.remove('elb-layout--mobile', 'elb-layout--desktop');
      } else {
        layout.classList.add('elb-layout--desktop');
        layout.classList.remove('elb-layout--mobile', 'elb-layout--tablet');
      }
    };

    checkBreakpoint();
    window.addEventListener('resize', checkBreakpoint);
  }

  // API
  return {
    getColumn: (index: number) => {
      return columns[index] || null;
    },

    setDirection: (newDirection: 'horizontal' | 'vertical') => {
      direction = newDirection;
      layout.classList.remove('elb-layout--horizontal', 'elb-layout--vertical');
      layout.classList.add(`elb-layout--${newDirection}`);
      applyLayoutStyles(layout, newDirection, options.gap);
    },

    addColumn: (config?: ColumnConfig) => {
      const index = columns.length;
      const column = createColumn(config || {}, index);
      columns.push(column);
      layout.appendChild(column);
      return index;
    },

    removeColumn: (index: number) => {
      const column = columns[index];
      if (column) {
        column.remove();
        columns.splice(index, 1);
      }
    },

    destroy: () => {
      clearChildren(layout);
      layout.remove();
    },
  };
}

/**
 * Inject layout styles
 */
function injectLayoutStyles(container: HTMLElement): void {
  const root = container.getRootNode();
  const target = root instanceof ShadowRoot ? root : document.head;

  if (target.querySelector('#elb-layout-styles')) return;

  const styles = `
    .elb-layout {
      display: flex;
      width: 100%;
      height: 100%;
      gap: var(--elb-spacing-md);
    }
    
    .elb-layout--horizontal {
      flex-direction: row;
    }
    
    .elb-layout--vertical {
      flex-direction: column;
    }
    
    .elb-layout-column {
      flex: 1;
      min-width: 0;
      overflow: hidden;
    }
    
    /* Responsive behavior */
    @media (max-width: 767px) {
      .elb-layout--mobile {
        flex-direction: column !important;
      }
    }
    
    @media (max-width: 1023px) {
      .elb-layout--tablet.elb-layout--horizontal {
        flex-wrap: wrap;
      }
      
      .elb-layout--tablet .elb-layout-column {
        flex-basis: 100%;
      }
    }
  `;

  const styleElement = createElement(
    'style',
    { id: 'elb-layout-styles' },
    styles,
  );
  target.appendChild(styleElement);
}
