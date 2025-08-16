/**
 * ControlPanel Molecule Component
 * Layout controls for LiveCode components
 */

import type { ControlPanelOptions, ControlPanelAPI } from '../types';
import { createIconButton } from '../atoms/iconButton';
import { createElement } from '../lib/dom';

/**
 * Create a control panel component
 */
export function createControlPanel(
  container: HTMLElement,
  options: ControlPanelOptions = {},
): ControlPanelAPI {
  let currentLayout = options.defaultLayout || 'columns';

  // Create panel container
  const panel = createElement('div', {
    class: 'elb-control-panel',
    style: options.visible === false ? 'display: none;' : '',
  });

  // Create button group
  const buttonGroup = createElement('div', { class: 'elb-control-group' });

  // Layout buttons
  if (options.showLayoutButtons !== false) {
    // Columns view button
    const columnsBtn = createIconButton(buttonGroup, {
      icon: 'columns',
      tooltip: 'Side by side',
      className: currentLayout === 'columns' ? 'elb-active' : '',
      onClick: () => {
        setLayout('columns');
        options.onLayoutChange?.('columns');
      },
    });

    // Rows view button
    const rowsBtn = createIconButton(buttonGroup, {
      icon: 'rows',
      tooltip: 'Stacked',
      className: currentLayout === 'rows' ? 'elb-active' : '',
      onClick: () => {
        setLayout('rows');
        options.onLayoutChange?.('rows');
      },
    });

    // Grid view button (if enabled)
    if (options.showGrid) {
      const gridBtn = createIconButton(buttonGroup, {
        icon: 'grid',
        tooltip: 'Grid view',
        className: currentLayout === 'grid' ? 'elb-active' : '',
        onClick: () => {
          setLayout('grid');
          options.onLayoutChange?.('grid');
        },
      });
    }
  }

  // Fullscreen button
  if (options.showFullscreen !== false) {
    // Add separator
    if (options.showLayoutButtons !== false) {
      const separator = createElement('div', {
        class: 'elb-control-separator',
      });
      buttonGroup.appendChild(separator);
    }

    const fullscreenBtn = createIconButton(buttonGroup, {
      icon: 'expand',
      tooltip: 'Fullscreen',
      onClick: () => {
        options.onFullscreen?.();
      },
    });
  }

  panel.appendChild(buttonGroup);
  container.appendChild(panel);

  // Inject styles
  injectControlPanelStyles(container);

  // Helper to update active button
  function setLayout(layout: 'columns' | 'rows' | 'grid') {
    currentLayout = layout;
    // Update active states
    const buttons = buttonGroup.querySelectorAll('.elb-icon-button');
    buttons.forEach((btn, index) => {
      if (layout === 'columns' && index === 0) {
        btn.classList.add('elb-active');
      } else if (layout === 'rows' && index === 1) {
        btn.classList.add('elb-active');
      } else if (layout === 'grid' && index === 2) {
        btn.classList.add('elb-active');
      } else if (index < 3) {
        // Only for layout buttons
        btn.classList.remove('elb-active');
      }
    });
  }

  // API
  return {
    show: () => {
      panel.style.display = '';
    },
    hide: () => {
      panel.style.display = 'none';
    },
    setLayout: (layout: 'columns' | 'rows' | 'grid') => {
      setLayout(layout);
    },
    destroy: () => {
      panel.remove();
    },
  };
}

/**
 * Inject control panel styles
 */
function injectControlPanelStyles(container: HTMLElement): void {
  const root = container.getRootNode();
  const target = root instanceof ShadowRoot ? root : document.head;

  if (target.querySelector('#elb-control-panel-styles')) return;

  const styles = `
    .elb-control-panel {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      padding: 0 0 var(--elb-spacing-xs) 0;
      margin-bottom: var(--elb-spacing-xs);
    }
    
    .elb-control-group {
      display: flex;
      align-items: center;
      gap: var(--elb-spacing-xs);
    }
    
    .elb-control-separator {
      width: 1px;
      height: 16px;
      background: var(--elb-border);
      margin: 0 var(--elb-spacing-xs);
      opacity: 0.3;
    }
    
    .elb-control-panel .elb-icon-button {
      background: transparent;
      border: none;
      color: var(--elb-muted);
    }
    
    .elb-control-panel .elb-icon-button:hover:not(:disabled) {
      background: transparent;
      color: var(--elb-fg);
      transform: none;
    }
    
    .elb-control-panel .elb-icon-button.elb-active {
      background: transparent;
      color: var(--elb-accent);
    }
    
    .elb-control-panel .elb-icon-button.elb-active:hover {
      background: transparent;
      color: var(--elb-accent);
      filter: brightness(1.2);
    }
  `;

  const styleElement = createElement(
    'style',
    { id: 'elb-control-panel-styles' },
    styles,
  );
  target.appendChild(styleElement);
}
