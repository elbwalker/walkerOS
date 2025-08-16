/**
 * IconButton Atom Component
 * Icon-only button with tooltip support
 */

import type { IconButtonOptions, IconButtonAPI } from '../types';
import { createElement, addListener } from '../lib/dom';

// Modern, minimalist SVG icon definitions
const icons = {
  copy: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
    <rect x="8" y="8" width="12" height="12" rx="2"></rect>
    <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"></path>
  </svg>`,

  format: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
    <path d="M8 6h8M8 12h8M8 18h8M4 6v12M20 6v12"></path>
  </svg>`,

  expand: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
    <path d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5"></path>
  </svg>`,

  collapse: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
    <path d="M4 8h5V3M15 8h5V3M4 16h5v5M15 16h5v5"></path>
  </svg>`,

  grid: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
    <rect x="3" y="3" width="7" height="7" rx="1"></rect>
    <rect x="14" y="3" width="7" height="7" rx="1"></rect>
    <rect x="3" y="14" width="7" height="7" rx="1"></rect>
    <rect x="14" y="14" width="7" height="7" rx="1"></rect>
  </svg>`,

  columns: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
    <rect x="3" y="3" width="18" height="18" rx="2"></rect>
    <line x1="12" y1="3" x2="12" y2="21"></line>
  </svg>`,

  rows: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
    <rect x="3" y="3" width="18" height="18" rx="2"></rect>
    <line x1="3" y1="12" x2="21" y2="12"></line>
  </svg>`,

  check: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <polyline points="20 6 9 17 4 12"></polyline>
  </svg>`,
};

/**
 * Create an icon button component
 */
export function createIconButton(
  container: HTMLElement,
  options: IconButtonOptions = {},
): IconButtonAPI {
  const button = createElement('button', {
    class: `elb-icon-button ${options.className || ''}`,
    disabled: options.disabled,
    type: 'button',
    'aria-label': options.tooltip || options.icon || 'Button',
  }) as HTMLButtonElement;

  // Add tooltip if provided
  if (options.tooltip) {
    button.setAttribute('data-tooltip', options.tooltip);
  }

  // Add icon
  const iconName = options.icon || 'copy';
  const iconSvg =
    options.customIcon || icons[iconName as keyof typeof icons] || icons.copy;
  button.innerHTML = iconSvg;

  container.appendChild(button);

  // Event listener
  const cleanup = options.onClick
    ? addListener(button, 'click', options.onClick)
    : null;

  // Inject styles
  injectIconButtonStyles(container);

  // API
  return {
    setIcon: (icon: string) => {
      const newIcon = icons[icon as keyof typeof icons] || icons.copy;
      button.innerHTML = newIcon;
    },

    setTooltip: (tooltip: string) => {
      button.setAttribute('data-tooltip', tooltip);
      button.setAttribute('aria-label', tooltip);
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
 * Inject icon button styles
 */
function injectIconButtonStyles(container: HTMLElement): void {
  const root = container.getRootNode();
  const target = root instanceof ShadowRoot ? root : document.head;

  if (target.querySelector('#elb-icon-button-styles')) return;

  const styles = `
    .elb-icon-button {
      position: relative;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      padding: 0;
      background: transparent !important;
      color: var(--elb-muted);
      border: none !important;
      border-radius: 6px;
      cursor: pointer;
      transition: color 150ms ease;
      outline: none !important;
      box-shadow: none !important;
    }
    
    .elb-icon-button:hover:not(:disabled) {
      background: transparent !important;
      color: var(--elb-fg);
      border: none !important;
      box-shadow: none !important;
    }
    
    .elb-icon-button:active:not(:disabled) {
      opacity: 0.8;
      background: transparent !important;
      border: none !important;
      box-shadow: none !important;
    }
    
    .elb-icon-button:disabled {
      opacity: 0.4;
      cursor: not-allowed;
      background: transparent !important;
      border: none !important;
    }
    
    .elb-icon-button:focus {
      outline: none !important;
      box-shadow: none !important;
      background: transparent !important;
      border: none !important;
    }
    
    .elb-icon-button:focus-visible {
      outline: none !important;
      box-shadow: none !important;
      background: transparent !important;
      border: none !important;
    }
    
    .elb-icon-button svg {
      width: 18px;
      height: 18px;
      pointer-events: none;
    }
    
    /* Modern tooltip styling */
    .elb-icon-button[data-tooltip] {
      position: relative;
    }
    
    .elb-icon-button[data-tooltip]::before {
      content: attr(data-tooltip);
      position: absolute;
      bottom: calc(100% + 8px);
      left: 50%;
      transform: translateX(-50%) scale(0.9);
      padding: 6px 10px;
      background: rgba(0, 0, 0, 0.9);
      color: white;
      font-size: 11px;
      font-family: var(--elb-font-sans);
      font-weight: 500;
      white-space: nowrap;
      border-radius: 4px;
      pointer-events: none;
      opacity: 0;
      transition: all 150ms ease;
      z-index: 10000;
    }
    
    .elb-icon-button[data-tooltip]:hover::before {
      opacity: 1;
      transform: translateX(-50%) scale(1);
    }
    
    /* Dark mode tooltip */
    [data-theme="dark"] .elb-icon-button[data-tooltip]::before {
      background: rgba(255, 255, 255, 0.9);
      color: black;
    }
    
    /* Variant for header positioning */
    .elb-icon-button--header {
      margin-left: auto;
    }
  `;

  const styleElement = createElement(
    'style',
    { id: 'elb-icon-button-styles' },
    styles,
  );
  target.appendChild(styleElement);
}
