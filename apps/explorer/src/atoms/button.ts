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
  const classes = [
    'elb-button',
    `elb-button--${options.variant || 'secondary'}`,
    options.active ? 'elb-button--active' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const attributes: Record<string, any> = {
    class: classes,
    disabled: options.disabled,
    type: 'button',
  };

  if (options.testId) {
    attributes['data-testid'] = options.testId;
  }

  const button = createElement('button', attributes) as HTMLButtonElement;

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

  // Note: Styles are now centralized and injected by box component

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

    setActive: (active: boolean) => {
      if (active) {
        button.classList.add('elb-button--active');
      } else {
        button.classList.remove('elb-button--active');
      }
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

// Button styles are now centralized in styles/theme.ts
