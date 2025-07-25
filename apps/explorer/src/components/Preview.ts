/**
 * Preview Component - HTML/Code preview with sandboxed execution
 *
 * Features:
 * - Safe HTML rendering in iframe
 * - Real-time preview updates
 * - Error handling and debugging
 * - Theme-aware styling
 * - Responsive design
 * - Functional factory pattern
 */

import { createComponent, type ComponentAPI } from '../core/Component';
import { createElement, addEventListener, injectCSS } from '../utils/dom';
import { debounce } from '../utils/debounce';

export interface PreviewOptions {
  html?: string;
  autoUpdate?: boolean;
  showErrors?: boolean;
  sandbox?: boolean;
  height?: string;
  title?: string;
  onLoad?: (iframe: HTMLIFrameElement) => void;
  onError?: (error: string) => void;
  onUpdate?: (html: string) => void;
}

export interface PreviewAPI extends ComponentAPI {
  setHTML(html: string): void;
  getHTML(): string;
  refresh(): void;
  getIframe(): HTMLIFrameElement | null;
  executeScript(script: string): Promise<any>;
  injectCSS(css: string): void;
}

/**
 * Create a Preview component
 */
export function createPreview(
  elementOrSelector: HTMLElement | string,
  options: PreviewOptions = {},
): PreviewAPI {
  const baseComponent = createComponent(elementOrSelector, {
    autoMount: false,
  });

  const element = baseComponent.getElement()!;
  element.classList.add('explorer-preview');

  // Component state
  let currentHTML = options.html || '';
  let iframe: HTMLIFrameElement | null = null;
  let errorDisplay: HTMLElement | null = null;
  let isLoading = false;

  // Cleanup functions
  const cleanupFunctions: Array<() => void> = [];

  // Debounced update for performance
  const debouncedUpdate = debounce(() => {
    updatePreview();
  }, 300);

  /**
   * Inject Preview CSS styles
   */
  function injectStyles(): void {
    const css = `
/* Preview Component Styles */
.explorer-preview {
  border: 1px solid var(--explorer-border-primary);
  border-radius: 8px;
  background: var(--explorer-bg-primary);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.explorer-preview__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: var(--explorer-bg-secondary);
  border-bottom: 1px solid var(--explorer-border-primary);
  font-size: 12px;
  color: var(--explorer-text-secondary);
}

.explorer-preview__title {
  font-weight: 600;
  color: var(--explorer-text-primary);
}

.explorer-preview__status {
  display: flex;
  align-items: center;
  gap: 8px;
}

.explorer-preview__status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--explorer-interactive-success);
}

.explorer-preview__status-dot--loading {
  background: var(--explorer-interactive-warning);
  animation: pulse 1.5s ease-in-out infinite;
}

.explorer-preview__status-dot--error {
  background: var(--explorer-interactive-error);
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.explorer-preview__content {
  flex: 1;
  position: relative;
  background: #ffffff;
  min-height: 200px;
}

.explorer-preview__iframe {
  width: 100%;
  height: 100%;
  border: none;
  background: #ffffff;
}

.explorer-preview__error {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--explorer-bg-primary);
  border: 2px dashed var(--explorer-border-error);
  border-radius: 4px;
  margin: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  color: var(--explorer-text-secondary);
  z-index: 10;
}

.explorer-preview__error-icon {
  font-size: 24px;
  margin-bottom: 8px;
  color: var(--explorer-interactive-error);
}

.explorer-preview__error-message {
  font-size: 14px;
  text-align: center;
  max-width: 300px;
  line-height: 1.4;
}

.explorer-preview__loading {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: var(--explorer-text-muted);
  font-size: 14px;
  z-index: 5;
}

/* Theme-aware iframe content */
[data-theme="dark"] .explorer-preview__content {
  background: #1a1a1a;
}

[data-theme="dark"] .explorer-preview__iframe {
  background: #1a1a1a;
}

/* Responsive design */
@media (max-width: 768px) {
  .explorer-preview__header {
    padding: 6px 8px;
    font-size: 11px;
  }
  
  .explorer-preview__content {
    min-height: 150px;
  }
}
`;

    injectCSS(css, 'explorer-preview-styles');
  }

  /**
   * Create the DOM structure
   */
  function createDOM(): void {
    element.innerHTML = '';

    // Create header
    const header = createElement('div', {
      className: 'explorer-preview__header',
    });

    const title = createElement('div', {
      className: 'explorer-preview__title',
      textContent: options.title || 'Preview',
    });

    const status = createElement('div', {
      className: 'explorer-preview__status',
    });
    const statusDot = createElement('div', {
      className: 'explorer-preview__status-dot',
    });
    const statusText = createElement('span', { textContent: 'Ready' });

    status.appendChild(statusDot);
    status.appendChild(statusText);

    header.appendChild(title);
    header.appendChild(status);
    element.appendChild(header);

    // Create content container
    const content = createElement('div', {
      className: 'explorer-preview__content',
    });

    // Set height
    if (options.height) {
      content.style.height = options.height;
    }

    // Create iframe
    iframe = createElement('iframe', {
      className: 'explorer-preview__iframe',
    }) as HTMLIFrameElement;

    if (options.sandbox) {
      iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin');
    }

    content.appendChild(iframe);

    // Create error display
    if (options.showErrors) {
      errorDisplay = createElement('div', {
        className: 'explorer-preview__error',
        style: 'display: none;',
      });

      const errorIcon = createElement('div', {
        className: 'explorer-preview__error-icon',
        textContent: '⚠️',
      });

      const errorMessage = createElement('div', {
        className: 'explorer-preview__error-message',
        textContent: 'Preview error occurred',
      });

      errorDisplay.appendChild(errorIcon);
      errorDisplay.appendChild(errorMessage);
      content.appendChild(errorDisplay);
    }

    element.appendChild(content);
  }

  /**
   * Update preview status
   */
  function updateStatus(
    status: 'ready' | 'loading' | 'error',
    message?: string,
  ): void {
    const statusDot = element.querySelector('.explorer-preview__status-dot');
    const statusText = element.querySelector('.explorer-preview__status span');

    if (!statusDot || !statusText) return;

    // Reset classes
    statusDot.className = 'explorer-preview__status-dot';

    switch (status) {
      case 'loading':
        statusDot.classList.add('explorer-preview__status-dot--loading');
        statusText.textContent = 'Loading...';
        break;
      case 'error':
        statusDot.classList.add('explorer-preview__status-dot--error');
        statusText.textContent = 'Error';
        break;
      case 'ready':
      default:
        statusText.textContent = 'Ready';
        break;
    }
  }

  /**
   * Show error display
   */
  function showError(message: string): void {
    if (!errorDisplay) return;

    const errorMessage = errorDisplay.querySelector(
      '.explorer-preview__error-message',
    );
    if (errorMessage) {
      errorMessage.textContent = message;
    }

    errorDisplay.style.display = 'flex';
    updateStatus('error');
    options.onError?.(message);
  }

  /**
   * Hide error display
   */
  function hideError(): void {
    if (errorDisplay) {
      errorDisplay.style.display = 'none';
    }
  }

  /**
   * Update the preview content
   */
  function updatePreview(): void {
    if (!iframe || isLoading) return;

    isLoading = true;
    updateStatus('loading');
    hideError();

    try {
      // Create a complete HTML document
      const fullHTML =
        currentHTML.includes('<!DOCTYPE') || currentHTML.includes('<html')
          ? currentHTML
          : `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Preview</title>
  <style>
    body { 
      margin: 0; 
      padding: 16px; 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: ${element.getAttribute('data-theme') === 'dark' ? '#1a1a1a' : '#ffffff'};
      color: ${element.getAttribute('data-theme') === 'dark' ? '#ffffff' : '#000000'};
    }
  </style>
</head>
<body>
  ${currentHTML}
  <script>
    // Error handling
    window.addEventListener('error', (e) => {
      parent.postMessage({
        type: 'preview-error',
        message: e.message,
        filename: e.filename,
        lineno: e.lineno
      }, '*');
    });
    
    // Ready notification
    window.addEventListener('DOMContentLoaded', () => {
      parent.postMessage({ type: 'preview-ready' }, '*');
    });
  </script>
</body>
</html>`;

      // Write to iframe
      const iframeDoc =
        iframe.contentDocument || iframe.contentWindow?.document;
      if (iframeDoc) {
        iframeDoc.open();
        iframeDoc.write(fullHTML);
        iframeDoc.close();
      }

      // Set loading timeout
      setTimeout(() => {
        if (isLoading) {
          isLoading = false;
          updateStatus('ready');
        }
      }, 2000);
    } catch (error) {
      isLoading = false;
      const message =
        error instanceof Error ? error.message : 'Unknown error occurred';
      showError(message);
    }
  }

  /**
   * Setup event listeners
   */
  function setupEventListeners(): void {
    // Listen for iframe messages
    const onMessage = (event: MessageEvent) => {
      if (event.data.type === 'preview-ready') {
        isLoading = false;
        updateStatus('ready');
        options.onLoad?.(iframe!);
      } else if (event.data.type === 'preview-error') {
        isLoading = false;
        showError(`Error: ${event.data.message}`);
      }
    };

    const messageHandler = addEventListener(
      window,
      'message' as keyof HTMLElementEventMap,
      onMessage as any,
    );
    cleanupFunctions.push(messageHandler);

    // Iframe load event
    if (iframe) {
      const onLoad = () => {
        // Fallback in case postMessage doesn't work
        setTimeout(() => {
          if (isLoading) {
            isLoading = false;
            updateStatus('ready');
          }
        }, 1000);
      };

      cleanupFunctions.push(addEventListener(iframe, 'load', onLoad));
    }
  }

  // Enhanced API
  const api: PreviewAPI = {
    ...baseComponent,

    setHTML(html: string): void {
      currentHTML = html;
      if (options.autoUpdate !== false) {
        debouncedUpdate();
      }
      options.onUpdate?.(html);
    },

    getHTML(): string {
      return currentHTML;
    },

    refresh(): void {
      updatePreview();
    },

    getIframe(): HTMLIFrameElement | null {
      return iframe;
    },

    async executeScript(script: string): Promise<any> {
      return new Promise((resolve, reject) => {
        if (!iframe?.contentWindow) {
          reject(new Error('Iframe not available'));
          return;
        }

        try {
          // Execute script in iframe context
          const result = (iframe.contentWindow as any).eval(script);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
    },

    injectCSS(css: string): void {
      if (!iframe?.contentDocument) return;

      const style = iframe.contentDocument.createElement('style');
      style.textContent = css;
      iframe.contentDocument.head.appendChild(style);
    },

    destroy(): void {
      cleanupFunctions.forEach((cleanup) => cleanup());
      cleanupFunctions.length = 0;
      baseComponent.destroy();
    },
  };

  // Initialize component
  injectStyles();
  createDOM();
  setupEventListeners();

  // Initial update if HTML provided
  if (currentHTML) {
    updatePreview();
  }

  // Mount the base component
  api.mount();

  return api;
}
