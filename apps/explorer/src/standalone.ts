// Standalone entry point for browser/IIFE build
// Creates vanilla JS Explorer instance inside Shadow DOM for complete isolation

import type { ExplorerConfig } from './types';
import { highlightHTML } from './utils/highlighter';

// Import CSS-based components (no toolbar/format functionality)
import { CodeEditorCSS } from './components/code-editor-css';
import { CodeBoxCSS } from './components/code-box-css';
import { ResultDisplayCSS } from './components/result-display-css';
import { LiveCodeCSS } from './components/live-code-css';
import { HtmlPreview } from './components/html-preview';
import { EventFlow } from './components/event-flow';

// Export all components for browser usage
export {
  CodeEditorCSS,
  CodeBoxCSS,
  ResultDisplayCSS,
  LiveCodeCSS,
  HtmlPreview,
  EventFlow,
};

// Export types
export type { CodeEditorOptions as CodeEditorCSSOptions } from './components/code-editor-css';
export type { HtmlPreviewOptions } from './components/html-preview';
export type { ResultDisplayOptions as ResultDisplayCSSOptions } from './components/result-display-css';
export type { CodeBoxOptions as CodeBoxCSSOptions } from './components/code-box-css';
export type { LiveCodeCSSOptions } from './components/live-code-css';
export type { EventFlowOptions } from './components/event-flow';

/**
 * Explorer instance interface
 */
interface ExplorerInstance {
  destroy: () => void;
  isInitialized: () => boolean;
}

/**
 * WalkerOS Explorer factory function following walkerOS patterns
 * Creates a vanilla JS Explorer instance inside Shadow DOM for complete isolation
 */
export async function createExplorer(
  config: ExplorerConfig = {},
): Promise<ExplorerInstance> {
  let shadowContainer: HTMLElement | undefined;
  let shadowRoot: ShadowRoot | undefined;
  let isInitialized = false;
  let observer: MutationObserver | undefined;
  const explorerElements = new Set<Element>();

  // Create shadow container
  shadowContainer = document.createElement('div');
  shadowContainer.id = 'walkeros-explorer-root';
  shadowContainer.style.cssText =
    'position: fixed; top: 0; left: 0; z-index: 999999; pointer-events: none;';

  // Attach shadow root
  shadowRoot = shadowContainer.attachShadow({ mode: 'closed' });

  // Add CSS reset and base styles to shadow DOM
  const style = document.createElement('style');
  style.textContent = `
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    
    .explorer-modal {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      padding: 20px;
      pointer-events: auto;
    }
    
    .explorer-modal-content {
      background-color: white;
      border-radius: 8px;
      max-width: 800px;
      max-height: 90vh;
      width: 100%;
      display: flex;
      flex-direction: column;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
    }
    
    .explorer-modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 20px;
      border-bottom: 1px solid #e5e7eb;
    }
    
    .explorer-modal-title {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
      color: #1f2937;
    }
    
    .explorer-modal-close {
      background: none;
      border: none;
      font-size: 24px;
      cursor: pointer;
      padding: 0;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      background-color: #f3f4f6;
      color: #6b7280;
    }
    
    .explorer-modal-body {
      flex: 1;
      padding: 20px;
      overflow: auto;
    }
    
    .explorer-code {
      font-family: ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace;
      font-size: 14px;
      line-height: 1.5;
      background-color: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      padding: 12px;
      overflow: auto;
      max-height: 400px;
      white-space: pre-wrap;
      word-break: break-word;
    }
    
    /* Syntax highlighting styles */
    .explorer-tag { color: #0969da; font-weight: 600; }
    .explorer-attr { color: #8250df; }
    .explorer-value { color: #0550ae; }
    .explorer-text { color: #1f2328; }
    .explorer-comment { color: #656d76; font-style: italic; }
    
    /* ELB attribute specific highlighting */
    .explorer-elb-attr { color: #1a7f37; font-weight: 600; }
    .explorer-elb-value { color: #0969da; font-weight: 500; }
    
    .explorer-icon {
      position: absolute;
      top: 4px;
      right: 4px;
      width: 20px;
      height: 20px;
      background-color: #3b82f6;
      color: white;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      opacity: 0;
      transition: opacity 0.2s ease, background-color 0.2s ease;
      z-index: 1000;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    }
    
    .explorer-icon:hover {
      background-color: #2563eb;
    }
    
    .explorer-icon svg {
      width: 16px;
      height: 16px;
    }
  `;
  shadowRoot.appendChild(style);

  const selector = config.selector || '[data-elbexplore]';
  let currentModal: HTMLDivElement | undefined;

  // Initialize elements with the selector
  function initializeElements() {
    const elements = document.querySelectorAll(selector);
    elements.forEach((element) => {
      addExplorerToElement(element);
    });
  }

  function addExplorerToElement(element: Element) {
    if ((element as any)._explorerInitialized) return;

    (element as any)._explorerInitialized = true;
    explorerElements.add(element);

    // Create explorer icon
    const icon = createExplorerIcon();
    (element as any)._explorerIcon = icon;

    // Set position relative if not already positioned
    const computedStyle = window.getComputedStyle(element);
    if (computedStyle.position === 'static') {
      (element as HTMLElement).style.position = 'relative';
    }

    // Add icon to element
    element.appendChild(icon);

    // Add click event to icon
    icon.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      showModal(element);
    });

    // Show/hide icon on hover
    let hoverTimeout: NodeJS.Timeout;

    element.addEventListener('mouseenter', () => {
      clearTimeout(hoverTimeout);
      icon.style.opacity = '1';
    });

    element.addEventListener('mouseleave', () => {
      hoverTimeout = setTimeout(() => {
        icon.style.opacity = '0';
      }, 200);
    });
  }

  function createExplorerIcon(): HTMLElement {
    const icon = document.createElement('div');
    icon.className = 'explorer-icon';
    icon.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M9.5 3L4 6.5L9.5 10L15 6.5L9.5 3Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
        <path d="M4 13.5L9.5 17L15 13.5" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
        <path d="M4 6.5V17.5" stroke="currentColor" stroke-width="2"/>
        <path d="M15 6.5V17.5" stroke="currentColor" stroke-width="2"/>
      </svg>`;

    return icon;
  }

  function getElementHTML(element: Element): string {
    const clone = element.cloneNode(true) as Element;

    // Remove explorer icons from clone
    const explorerIcons = clone.querySelectorAll('.explorer-icon');
    explorerIcons.forEach((icon) => icon.remove());

    return formatHTML(clone.outerHTML);
  }

  function formatHTML(html: string): string {
    let formatted = '';
    let indent = 0;
    const tab = '  ';

    const tokens = html.split(/(<\/?[^>]+>)/);

    tokens.forEach((token) => {
      if (token.trim()) {
        if (token.startsWith('</')) {
          indent--;
          formatted += tab.repeat(Math.max(0, indent)) + token + '\n';
        } else if (token.startsWith('<') && !token.endsWith('/>')) {
          formatted += tab.repeat(indent) + token + '\n';
          if (!token.includes('</')) {
            indent++;
          }
        } else if (token.startsWith('<') && token.endsWith('/>')) {
          formatted += tab.repeat(indent) + token + '\n';
        } else {
          const trimmed = token.trim();
          if (trimmed) {
            formatted += tab.repeat(indent) + trimmed + '\n';
          }
        }
      }
    });

    return formatted.trim();
  }

  function showModal(element: Element) {
    if (currentModal) return; // Only one modal at a time

    const html = getElementHTML(element);
    const highlightedHTML = highlightHTML(html);

    // Create modal
    currentModal = document.createElement('div');
    currentModal.className = 'explorer-modal';

    const modalContent = document.createElement('div');
    modalContent.className = 'explorer-modal-content';

    const modalHeader = document.createElement('div');
    modalHeader.className = 'explorer-modal-header';

    const modalTitle = document.createElement('h3');
    modalTitle.className = 'explorer-modal-title';
    modalTitle.textContent = 'Element Explorer';

    const closeButton = document.createElement('button');
    closeButton.className = 'explorer-modal-close';
    closeButton.textContent = '×';

    modalHeader.appendChild(modalTitle);
    modalHeader.appendChild(closeButton);

    const modalBody = document.createElement('div');
    modalBody.className = 'explorer-modal-body';

    const codeContainer = document.createElement('pre');
    codeContainer.className = 'explorer-code';
    codeContainer.innerHTML = highlightedHTML; // Use innerHTML for syntax highlighting

    modalBody.appendChild(codeContainer);
    modalContent.appendChild(modalHeader);
    modalContent.appendChild(modalBody);
    currentModal.appendChild(modalContent);

    // Add event listeners
    closeButton.addEventListener('click', closeModal);

    currentModal.addEventListener('click', (e) => {
      if (e.target === currentModal) {
        closeModal();
      }
    });

    // Close on escape key
    const handleEscKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeModal();
      }
    };
    document.addEventListener('keydown', handleEscKey);

    // Store the escape handler for cleanup
    (currentModal as any)._escapeHandler = handleEscKey;

    if (shadowRoot) {
      shadowRoot.appendChild(currentModal);
    }
  }

  function closeModal() {
    if (!currentModal) return;

    // Remove escape key listener
    const escapeHandler = (currentModal as any)._escapeHandler;
    if (escapeHandler) {
      document.removeEventListener('keydown', escapeHandler);
    }

    currentModal.remove();
    currentModal = undefined;
  }

  // Initial setup
  initializeElements();

  // Observer for dynamically added elements
  observer = new MutationObserver(() => {
    initializeElements();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  // Add to document
  document.body.appendChild(shadowContainer);
  isInitialized = true;

  // Return explorer instance API
  return {
    destroy() {
      if (observer) {
        observer.disconnect();
        observer = undefined;
      }

      // Clean up icons
      explorerElements.forEach((element) => {
        const el = element as any;
        if (el._explorerIcon) {
          el._explorerIcon.remove();
          delete el._explorerIcon;
          delete el._explorerInitialized;
        }
      });
      explorerElements.clear();

      // Close any open modal
      closeModal();

      if (shadowContainer && shadowContainer.parentNode) {
        shadowContainer.parentNode.removeChild(shadowContainer);
      }

      shadowContainer = undefined;
      shadowRoot = undefined;
      isInitialized = false;
    },

    isInitialized() {
      return isInitialized;
    },
  };
}

// Components are already imported above

// Global API for browser usage following walkerOS patterns
declare global {
  interface Window {
    createExplorer: typeof createExplorer;
    WalkerOSExplorer: {
      createExplorer: typeof createExplorer;
      CodeEditorCSS: typeof CodeEditorCSS;
      HtmlPreview: typeof HtmlPreview;
      ResultDisplayCSS: typeof ResultDisplayCSS;
      CodeBoxCSS: typeof CodeBoxCSS;
      LiveCodeCSS: typeof LiveCodeCSS;
      EventFlow: typeof EventFlow;
    };
  }
}

// Export for IIFE build
if (typeof window !== 'undefined') {
  window.createExplorer = createExplorer;
  window.WalkerOSExplorer = {
    createExplorer,
    CodeEditorCSS,
    HtmlPreview,
    ResultDisplayCSS,
    CodeBoxCSS,
    LiveCodeCSS,
    EventFlow,
  };
}

export default createExplorer;
