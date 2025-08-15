/**
 * Box Atom Component
 * Base container with optional header and footer
 */

import type { BoxOptions, BoxAPI } from '../types';
import { createShadow, createElement, clearChildren } from '../lib/dom';
import { getBaseStyles } from '../styles/theme';

/**
 * Create a box component
 */
export function createBox(
  element: HTMLElement,
  options: BoxOptions = {},
): BoxAPI {
  const { shadow, container } = createShadow(element);

  // Inject styles
  const styles = createElement('style', {}, getBaseStyles() + getBoxStyles());
  shadow.appendChild(styles);

  // Create structure
  const box = createElement('div', {
    class: `elb-box ${options.className || ''}`,
  });

  let header: HTMLElement | null = null;
  let content: HTMLElement;
  let footer: HTMLElement | null = null;

  // Header
  if (options.showHeader !== false && options.label) {
    header = createElement('div', { class: 'elb-box-header' });
    const label = createElement(
      'span',
      { class: 'elb-box-label' },
      options.label,
    );
    header.appendChild(label);
    box.appendChild(header);
  }

  // Content
  content = createElement('div', { class: 'elb-box-content' });
  box.appendChild(content);

  // Footer
  if (options.showFooter) {
    footer = createElement('div', { class: 'elb-box-footer' });
    box.appendChild(footer);
  }

  container.appendChild(box);

  // API
  return {
    setLabel: (label: string) => {
      if (!header) {
        header = createElement('div', { class: 'elb-box-header' });
        const labelElement = createElement(
          'span',
          { class: 'elb-box-label' },
          label,
        );
        header.appendChild(labelElement);
        box.insertBefore(header, content);
      } else {
        const labelElement = header.querySelector('.elb-box-label');
        if (labelElement) labelElement.textContent = label;
      }
    },

    getContent: () => content,
    getHeader: () => header,
    getFooter: () => footer,

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
      background: var(--elb-bg);
      overflow: hidden;
    }
    
    .elb-box-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--elb-spacing-sm) var(--elb-spacing-md);
      border-bottom: 1px solid var(--elb-border);
      background: var(--elb-bg);
    }
    
    .elb-box-label {
      font-size: var(--elb-font-size-sm);
      font-weight: 600;
      color: var(--elb-fg);
    }
    
    .elb-box-content {
      flex: 1;
      overflow: auto;
      padding: var(--elb-spacing-md);
    }
    
    .elb-box-footer {
      display: flex;
      align-items: center;
      gap: var(--elb-spacing-sm);
      padding: var(--elb-spacing-sm) var(--elb-spacing-md);
      border-top: 1px solid var(--elb-border);
      background: var(--elb-bg);
    }
  `;
}
