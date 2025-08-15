/**
 * Label Atom Component
 * Simple text label component
 */

import type { LabelOptions, LabelAPI } from '../types';
import { createElement } from '../lib/dom';

/**
 * Create a label component
 */
export function createLabel(
  container: HTMLElement,
  options: LabelOptions,
): LabelAPI {
  const label = createElement('div', {
    class: `elb-label ${options.className || ''}`,
  });

  const text = createElement('span', { class: 'elb-label-text' }, options.text);
  label.appendChild(text);

  container.appendChild(label);

  // Inject styles
  injectLabelStyles(container);

  // API
  return {
    setText: (newText: string) => {
      text.textContent = newText;
    },

    destroy: () => {
      label.remove();
    },
  };
}

/**
 * Inject label styles
 */
function injectLabelStyles(container: HTMLElement): void {
  const root = container.getRootNode();
  const target = root instanceof ShadowRoot ? root : document.head;

  if (target.querySelector('#elb-label-styles')) return;

  const styles = `
    .elb-label {
      display: flex;
      align-items: center;
      padding: var(--elb-spacing-xs) 0;
    }
    
    .elb-label-text {
      font-size: var(--elb-font-size-sm);
      font-weight: 600;
      color: var(--elb-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
  `;

  const styleElement = createElement(
    'style',
    { id: 'elb-label-styles' },
    styles,
  );
  target.appendChild(styleElement);
}
