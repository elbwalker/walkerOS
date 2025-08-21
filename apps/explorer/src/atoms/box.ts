/**
 * Box Atom Component
 * Base container with optional header and footer
 */

import type { BoxOptions, BoxAPI } from '../types';
import { createShadow, createElement, clearChildren } from '../lib/dom';
import { getCompleteStyles } from '../styles/theme';

/**
 * Create a box component
 */
export function createBox(
  element: HTMLElement,
  options: BoxOptions = {},
): BoxAPI {
  const { shadow, container } = createShadow(element);

  // Inject styles - now includes all component styles
  const styles = createElement(
    'style',
    {},
    getCompleteStyles() + getBoxStyles(),
  );
  shadow.appendChild(styles);

  // Create structure
  const box = createElement('div', {
    class: `elb-box ${options.className || ''} ${options.noPadding ? 'elb-box--no-padding' : ''}`,
  });

  let header: HTMLElement | null = null;
  let headerLeft: HTMLElement | null = null;
  let headerCenter: HTMLElement | null = null;
  let headerRight: HTMLElement | null = null;
  let content: HTMLElement;
  let footer: HTMLElement | null = null;

  // Header with zones
  if (
    options.showHeader !== false &&
    (options.label ||
      options.headerLeft ||
      options.headerCenter ||
      options.headerRight)
  ) {
    header = createElement('div', { class: 'elb-box-header' });

    // Left zone (label by default)
    headerLeft = createElement('div', { class: 'elb-box-header-left' });
    if (options.label) {
      const label = createElement(
        'span',
        { class: 'elb-box-label' },
        options.label,
      );
      headerLeft.appendChild(label);
    }
    if (options.headerLeft) {
      headerLeft.appendChild(options.headerLeft);
    }
    header.appendChild(headerLeft);

    // Center zone
    headerCenter = createElement('div', { class: 'elb-box-header-center' });
    if (options.headerCenter) {
      headerCenter.appendChild(options.headerCenter);
    }
    header.appendChild(headerCenter);

    // Right zone
    headerRight = createElement('div', { class: 'elb-box-header-right' });
    if (options.headerRight) {
      headerRight.appendChild(options.headerRight);
    }
    header.appendChild(headerRight);

    box.appendChild(header);
  }

  // Content
  content = createElement('div', {
    class: `elb-box-content ${options.noPadding ? 'elb-box-content--no-padding' : ''}`,
  });
  box.appendChild(content);

  // Footer
  if (options.showFooter || options.footerContent) {
    footer = createElement('div', { class: 'elb-box-footer' });

    // Add custom footer content if provided
    if (options.footerContent) {
      footer.appendChild(options.footerContent);
    }

    box.appendChild(footer);
  }

  container.appendChild(box);

  // API
  return {
    setLabel: (label: string) => {
      if (!header || !headerLeft) {
        // Create header if it doesn't exist
        if (!header) {
          header = createElement('div', { class: 'elb-box-header' });
          headerLeft = createElement('div', { class: 'elb-box-header-left' });
          headerCenter = createElement('div', {
            class: 'elb-box-header-center',
          });
          headerRight = createElement('div', { class: 'elb-box-header-right' });
          header.appendChild(headerLeft);
          header.appendChild(headerCenter);
          header.appendChild(headerRight);
          box.insertBefore(header, content);
        }
      }

      // Update or create label
      let labelElement = headerLeft!.querySelector(
        '.elb-box-label',
      ) as HTMLElement;
      if (!labelElement) {
        labelElement = createElement('span', { class: 'elb-box-label' });
        headerLeft!.appendChild(labelElement);
      }
      labelElement.textContent = label;
    },

    getContent: () => content,
    getHeader: () => header,
    getHeaderLeft: () => headerLeft,
    getHeaderCenter: () => headerCenter,
    getHeaderRight: () => headerRight,
    getFooter: () => footer,
    getContainer: () => box,

    destroy: () => {
      clearChildren(container);
      element.remove();
    },
  };
}

/**
 * Box-specific styles
 */
function getBoxStyles(): string {
  return `
    .elb-box {
      display: flex;
      flex-direction: column;
      height: 100%;
      border: 1px solid var(--elb-border);
      border-radius: var(--elb-radius-md);
      background: var(--elb-surface);
      overflow: hidden;
      box-shadow: var(--elb-shadow-sm);
    }
    
    .elb-box-header {
      display: flex;
      align-items: center;
      min-height: 40px;
      padding: 0 var(--elb-spacing-sm);
      border-bottom: 1px solid var(--elb-border);
      background: transparent;
      gap: var(--elb-spacing-sm);
    }
    
    .elb-box-header-left {
      display: flex;
      align-items: center;
      gap: var(--elb-spacing-sm);
    }
    
    .elb-box-header-center {
      display: flex;
      align-items: center;
      justify-content: center;
      flex: 1;
    }
    
    .elb-box-header-right {
      display: flex;
      align-items: center;
      gap: var(--elb-spacing-xs);
    }
    
    .elb-box-label {
      font-size: var(--elb-font-size-sm);
      font-weight: 500;
      color: var(--elb-fg);
      letter-spacing: -0.01em;
      white-space: nowrap;
    }
    
    .elb-box-content {
      flex: 1;
      overflow: auto;
      padding: var(--elb-spacing-md);
      background: transparent;
    }
    
    .elb-box-content--no-padding {
      padding: 0;
    }
    
    .elb-box--no-padding .elb-box-content {
      padding: 0;
    }
    
    .elb-box-footer {
      display: flex;
      align-items: center;
      gap: var(--elb-spacing-sm);
      min-height: 40px;
      padding: 0 var(--elb-spacing-md);
      border-top: 1px solid var(--elb-border);
      background: transparent;
    }
    
    /* Scrollbar styling */
    .elb-box-content::-webkit-scrollbar {
      width: 8px;
      height: 8px;
    }
    
    .elb-box-content::-webkit-scrollbar-track {
      background: transparent;
    }
    
    .elb-box-content::-webkit-scrollbar-thumb {
      background: var(--elb-border);
      border-radius: var(--elb-radius-sm);
    }
    
    .elb-box-content::-webkit-scrollbar-thumb:hover {
      background: var(--elb-muted);
    }
  `;
}
