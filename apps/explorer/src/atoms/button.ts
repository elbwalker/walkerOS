/**
 * Button Atom Component
 * Simple button with variants
 */

import type { ButtonOptions, ButtonAPI } from '../types';
import { createElement, addListener } from '../lib/dom';

/**
 * Create a button component
 */
export function createButton(
  container: HTMLElement,
  options: ButtonOptions = {},
): ButtonAPI {
  const button = createElement('button', {
    class: `elb-button elb-button--${options.variant || 'secondary'}`,
    disabled: options.disabled,
    type: 'button',
  }) as HTMLButtonElement;

  // Add icon if provided
  if (options.icon) {
    const icon = createElement(
      'span',
      { class: 'elb-button-icon' },
      options.icon,
    );
    button.appendChild(icon);
  }

  // Add text
  if (options.text) {
    const text = createElement(
      'span',
      { class: 'elb-button-text' },
      options.text,
    );
    button.appendChild(text);
  }

  container.appendChild(button);

  // Event listener
  const cleanup = options.onClick
    ? addListener(button, 'click', options.onClick)
    : null;

  // Inject styles
  injectButtonStyles(container);

  // API
  return {
    setText: (text: string) => {
      const textElement = button.querySelector('.elb-button-text');
      if (textElement) {
        textElement.textContent = text;
      } else {
        const newText = createElement(
          'span',
          { class: 'elb-button-text' },
          text,
        );
        button.appendChild(newText);
      }
    },

    setDisabled: (disabled: boolean) => {
      button.disabled = disabled;
    },

    click: () => {
      button.click();
    },

    destroy: () => {
      cleanup?.();
      button.remove();
    },
  };
}

/**
 * Inject button styles
 */
function injectButtonStyles(container: HTMLElement): void {
  const root = container.getRootNode();
  const target = root instanceof ShadowRoot ? root : document.head;

  if (target.querySelector('#elb-button-styles')) return;

  const styles = `
    .elb-button {
      display: inline-flex;
      align-items: center;
      gap: var(--elb-spacing-xs);
      padding: var(--elb-spacing-xs) var(--elb-spacing-sm);
      font-family: var(--elb-font-sans);
      font-size: var(--elb-font-size-sm);
      font-weight: 500;
      border-radius: var(--elb-radius-sm);
      border: 1px solid transparent;
      cursor: pointer;
      transition: all var(--elb-transition-fast);
      outline: none;
    }
    
    .elb-button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    
    .elb-button:focus-visible {
      outline: 2px solid var(--elb-accent);
      outline-offset: 2px;
    }
    
    /* Primary variant */
    .elb-button--primary {
      background: var(--elb-accent);
      color: white;
      border-color: var(--elb-accent);
    }
    
    .elb-button--primary:hover:not(:disabled) {
      background: var(--elb-accent);
      filter: brightness(1.1);
    }
    
    /* Secondary variant */
    .elb-button--secondary {
      background: var(--elb-bg);
      color: var(--elb-fg);
      border-color: var(--elb-border);
    }
    
    .elb-button--secondary:hover:not(:disabled) {
      background: var(--elb-border);
    }
    
    /* Ghost variant */
    .elb-button--ghost {
      background: transparent;
      color: var(--elb-fg);
      border-color: transparent;
    }
    
    .elb-button--ghost:hover:not(:disabled) {
      background: var(--elb-border);
    }
    
    .elb-button-icon {
      display: flex;
      align-items: center;
    }
    
    .elb-button-text {
      display: inline-block;
    }
  `;

  const styleElement = createElement(
    'style',
    { id: 'elb-button-styles' },
    styles,
  );
  target.appendChild(styleElement);
}
