/**
 * Overlay Atom Component
 * Fullscreen overlay with portal rendering
 */

import type { OverlayOptions, OverlayAPI } from '../types';
import { createElement, addListener } from '../lib/dom';

/**
 * Create an overlay component
 */
export function createOverlay(options: OverlayOptions = {}): OverlayAPI {
  let isOpen = false;
  let contentElement: HTMLElement | null = null;
  let originalParent: HTMLElement | null = null;
  let originalNextSibling: Node | null = null;
  const cleanups: Array<() => void> = [];

  // Create overlay structure
  const overlay = createElement('div', {
    class: 'elb-overlay',
    'aria-hidden': 'true',
  });

  const backdrop = createElement('div', {
    class: 'elb-overlay-backdrop',
  });

  const container = createElement('div', {
    class: 'elb-overlay-container',
  });

  const closeButton = createElement('button', {
    class: 'elb-overlay-close',
    type: 'button',
    'aria-label': 'Close overlay',
  });
  closeButton.innerHTML = `
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  `;

  overlay.appendChild(backdrop);
  overlay.appendChild(container);
  container.appendChild(closeButton);

  // Inject styles
  injectOverlayStyles();

  // Close handler
  const handleClose = () => {
    if (!options.preventClose) {
      close();
    }
    options.onClose?.();
  };

  // Event listeners
  cleanups.push(addListener(backdrop, 'click', handleClose));
  cleanups.push(addListener(closeButton, 'click', handleClose));

  // ESC key handler
  const handleEscape = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && isOpen) {
      handleClose();
    }
  };

  // Open function
  const open = (element?: HTMLElement) => {
    if (isOpen) return;

    if (element) {
      // Store original position
      contentElement = element;
      originalParent = element.parentElement;
      originalNextSibling = element.nextSibling;

      // Move element to overlay
      container.appendChild(element);
      element.classList.add('elb-overlay-content');
    }

    // Append overlay to body
    document.body.appendChild(overlay);

    // Add ESC listener
    document.addEventListener('keydown', handleEscape);

    // Trigger animation
    requestAnimationFrame(() => {
      overlay.classList.add('elb-overlay--active');
      overlay.setAttribute('aria-hidden', 'false');
    });

    isOpen = true;
    options.onOpen?.();
  };

  // Close function
  const close = () => {
    if (!isOpen) return;

    // Start close animation
    overlay.classList.remove('elb-overlay--active');
    overlay.setAttribute('aria-hidden', 'true');

    // Wait for animation to complete
    setTimeout(() => {
      // Restore original element position
      if (contentElement && originalParent) {
        contentElement.classList.remove('elb-overlay-content');

        if (originalNextSibling) {
          originalParent.insertBefore(contentElement, originalNextSibling);
        } else {
          originalParent.appendChild(contentElement);
        }

        contentElement = null;
        originalParent = null;
        originalNextSibling = null;
      }

      // Remove overlay from DOM
      overlay.remove();

      // Remove ESC listener
      document.removeEventListener('keydown', handleEscape);

      isOpen = false;
    }, 200); // Match transition duration
  };

  // API
  return {
    open,
    close,
    isOpen: () => isOpen,
    setContent: (element: HTMLElement) => {
      if (contentElement) {
        container.removeChild(contentElement);
      }
      contentElement = element;
      container.appendChild(element);
      element.classList.add('elb-overlay-content');
    },
    destroy: () => {
      close();
      cleanups.forEach((cleanup) => cleanup());
    },
  };
}

/**
 * Inject overlay styles
 */
function injectOverlayStyles(): void {
  if (document.querySelector('#elb-overlay-styles')) return;

  const styles = `
    .elb-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem;
      opacity: 0;
      visibility: hidden;
      transition: opacity 200ms ease, visibility 200ms ease;
    }
    
    .elb-overlay--active {
      opacity: 1;
      visibility: visible;
    }
    
    .elb-overlay-backdrop {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(4px);
      -webkit-backdrop-filter: blur(4px);
    }
    
    .elb-overlay-container {
      position: relative;
      width: min(95vw, 1800px);
      height: 90vh;
      background: var(--elb-bg, #ffffff);
      border-radius: 12px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
      display: flex;
      flex-direction: column;
      transform: scale(0.98);
      transition: transform 200ms ease;
    }
    
    .elb-overlay--active .elb-overlay-container {
      transform: scale(1);
    }
    
    .elb-overlay-close {
      position: absolute;
      top: 1rem;
      right: 1rem;
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--elb-bg, #ffffff);
      border: 1px solid var(--elb-border, #e5e7eb);
      border-radius: 8px;
      cursor: pointer;
      color: var(--elb-muted, #6b7280);
      transition: all 150ms ease;
      z-index: 10;
    }
    
    .elb-overlay-close:hover {
      background: var(--elb-hover, #f4f4f5);
      color: var(--elb-fg, #0a0a0a);
    }
    
    .elb-overlay-close:focus {
      outline: 2px solid var(--elb-accent, #2563eb);
      outline-offset: 2px;
    }
    
    .elb-overlay-content {
      width: 100%;
      height: 100%;
      border-radius: 12px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
    
    /* Preserve layout styles in fullscreen */
    .elb-overlay-content .elb-layout {
      display: flex !important;
      width: 100% !important;
      height: 100% !important;
      gap: var(--elb-spacing-md) !important;
    }
    
    .elb-overlay-content .elb-layout--horizontal {
      flex-direction: row !important;
    }
    
    .elb-overlay-content .elb-layout--vertical {
      flex-direction: column !important;
    }
    
    .elb-overlay-content .elb-layout-column {
      flex: 1 !important;
      min-width: 0 !important;
      overflow: hidden !important;
    }
    
    /* Dark mode support */
    @media (prefers-color-scheme: dark) {
      .elb-overlay-container {
        background: var(--elb-dark-bg, #0a0a0a);
      }
      
      .elb-overlay-close {
        background: var(--elb-dark-bg, #0a0a0a);
        border-color: var(--elb-dark-border, #27272a);
        color: var(--elb-dark-muted, #a1a1aa);
      }
      
      .elb-overlay-close:hover {
        background: var(--elb-dark-hover, #27272a);
        color: var(--elb-dark-fg, #fafafa);
      }
    }
    
    /* Check parent theme */
    html[data-theme="dark"] .elb-overlay-container {
      background: var(--elb-dark-bg, #0a0a0a);
    }
    
    html[data-theme="dark"] .elb-overlay-close {
      background: var(--elb-dark-bg, #0a0a0a);
      border-color: var(--elb-dark-border, #27272a);
      color: var(--elb-dark-muted, #a1a1aa);
    }
    
    html[data-theme="dark"] .elb-overlay-close:hover {
      background: var(--elb-dark-hover, #27272a);
      color: var(--elb-dark-fg, #fafafa);
    }
  `;

  const styleElement = createElement(
    'style',
    { id: 'elb-overlay-styles' },
    styles,
  );
  document.head.appendChild(styleElement);
}
