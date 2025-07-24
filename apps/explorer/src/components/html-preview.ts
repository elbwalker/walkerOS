import { BaseComponent } from '../core/base-component';

export interface HtmlPreviewOptions {
  html?: string;
  previewId?: string;
  showBorder?: boolean;
  height?: string;
  maxHeight?: string;
  onElementClick?: (element: HTMLElement, event: MouseEvent) => void;
  onReady?: () => void;
}

/**
 * HTML Preview component with Shadow DOM isolation
 * Renders HTML content in a safe, isolated environment
 */
export class HtmlPreview extends BaseComponent {
  private options: Required<HtmlPreviewOptions>;
  private previewContainer!: HTMLDivElement;
  private previewContent!: HTMLDivElement;
  private currentHtml = '';

  constructor(
    container: HTMLElement | string,
    options: HtmlPreviewOptions = {},
  ) {
    const defaultOptions = {
      html: options.html || '',
      previewId: options.previewId || 'preview',
      showBorder: options.showBorder !== undefined ? options.showBorder : true,
      height: options.height || '200px',
      maxHeight: options.maxHeight || 'none',
      onElementClick: options.onElementClick || (() => {}),
      onReady: options.onReady || (() => {}),
    };

    super(container, { useShadowDOM: true, autoInitialize: false });

    this.options = defaultOptions;
    this.currentHtml = this.options.html;

    this.initialize();
  }

  protected initialize(): void {
    this.injectStyles(this.getStyles());
    this.createElements();
    this.setupEventListeners();
    this.updateContent();
    this.options.onReady();
  }

  private createElements(): void {
    const root = this.getRoot();

    // Main container
    this.previewContainer = this.createContainer('html-preview-container', {
      border: this.options.showBorder ? '1px solid #d1d5db' : 'none',
      borderRadius: '6px',
      backgroundColor: '#ffffff',
      height: this.options.height,
      maxHeight: this.options.maxHeight,
      overflow: 'auto',
      position: 'relative',
    });

    // Content container where HTML will be rendered
    this.previewContent = this.createContainer('html-preview-content', {
      padding: '12px',
      minHeight: '100%',
      position: 'relative',
    });

    // Add preview ID attribute for walkerOS integration
    this.previewContent.setAttribute('data-preview-id', this.options.previewId);

    this.previewContainer.appendChild(this.previewContent);
    root.appendChild(this.previewContainer);
  }

  private setupEventListeners(): void {
    // Capture clicks within the preview for element exploration
    this.addEventListener(this.previewContent, 'click', (event) => {
      const target = event.target as HTMLElement;
      if (target && target !== this.previewContent) {
        event.preventDefault();
        event.stopPropagation();
        this.options.onElementClick(target, event);
      }
    });

    // Prevent form submissions in preview
    this.addEventListener(this.previewContent, 'submit', (event) => {
      event.preventDefault();
    });

    // Prevent navigation in preview
    this.addEventListener(this.previewContent, 'click', (event) => {
      const target = event.target as HTMLElement;
      if (target.tagName === 'A') {
        event.preventDefault();
      }
    });
  }

  private updateContent(): void {
    if (!this.previewContent) return;

    try {
      // Clear existing content
      this.previewContent.innerHTML = '';

      if (!this.currentHtml.trim()) {
        this.showEmptyState();
        return;
      }

      // Create a temporary container to parse HTML safely
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = this.currentHtml;

      // Process and sanitize the HTML
      this.sanitizeHTML(tempDiv);

      // Move processed content to preview
      while (tempDiv.firstChild) {
        this.previewContent.appendChild(tempDiv.firstChild);
      }

      // Add walkerOS data attributes if needed
      this.addWalkerOSIntegration();
    } catch (error) {
      this.showError('Failed to render HTML: ' + String(error));
    }
  }

  private sanitizeHTML(container: HTMLElement): void {
    // Remove potentially dangerous elements and attributes
    const dangerousElements = container.querySelectorAll(
      'script, iframe, object, embed, link[rel="stylesheet"]',
    );
    dangerousElements.forEach((el) => el.remove());

    // Remove dangerous attributes
    const allElements = container.querySelectorAll('*');
    allElements.forEach((el) => {
      const dangerousAttrs = [
        'onload',
        'onerror',
        'onclick',
        'onmouseover',
        'onfocus',
        'onblur',
      ];
      dangerousAttrs.forEach((attr) => {
        if (el.hasAttribute(attr)) {
          el.removeAttribute(attr);
        }
      });

      // Convert javascript: hrefs to #
      if (el.tagName === 'A') {
        const href = el.getAttribute('href');
        if (href && href.toLowerCase().startsWith('javascript:')) {
          el.setAttribute('href', '#');
        }
      }
    });
  }

  private addWalkerOSIntegration(): void {
    // Add preview ID to elements that might trigger events
    const interactiveElements = this.previewContent.querySelectorAll(
      'button, a, [data-elb], [data-elbaction]',
    );
    interactiveElements.forEach((el) => {
      if (!el.hasAttribute('data-preview-id')) {
        el.setAttribute('data-preview-id', this.options.previewId);
      }
    });
  }

  private showEmptyState(): void {
    const emptyState = this.createElement(
      'div',
      { class: 'html-preview-empty' },
      {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100px',
        color: '#6b7280',
        fontSize: '14px',
        fontStyle: 'italic',
      },
    );
    emptyState.textContent = 'No HTML to preview';
    this.previewContent.appendChild(emptyState);
  }

  private showError(message: string): void {
    const errorState = this.createElement(
      'div',
      { class: 'html-preview-error' },
      {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100px',
        color: '#dc2626',
        fontSize: '14px',
        backgroundColor: '#fef2f2',
        border: '1px solid #fecaca',
        borderRadius: '4px',
        padding: '12px',
        margin: '12px',
      },
    );
    errorState.textContent = message;
    this.previewContent.appendChild(errorState);
  }

  private getStyles(): string {
    return `
      .html-preview-container {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        box-sizing: border-box;
      }

      .html-preview-content {
        box-sizing: border-box;
      }

      .html-preview-content * {
        box-sizing: border-box;
      }

      /* Reset some default styles to avoid conflicts */
      .html-preview-content h1,
      .html-preview-content h2,
      .html-preview-content h3,
      .html-preview-content h4,
      .html-preview-content h5,
      .html-preview-content h6 {
        margin: 0 0 1rem 0;
        font-weight: 600;
      }

      .html-preview-content p {
        margin: 0 0 1rem 0;
      }

      .html-preview-content ul,
      .html-preview-content ol {
        margin: 0 0 1rem 0;
        padding-left: 1.5rem;
      }

      .html-preview-content button {
        cursor: pointer;
        padding: 0.5rem 1rem;
        border: 1px solid #d1d5db;
        border-radius: 0.375rem;
        background-color: #ffffff;
        color: #374151;
        font-size: 0.875rem;
        transition: all 0.2s ease;
      }

      .html-preview-content button:hover {
        background-color: #f9fafb;
        border-color: #9ca3af;
      }

      .html-preview-content a {
        color: #3b82f6;
        text-decoration: underline;
      }

      .html-preview-content a:hover {
        color: #1d4ed8;
      }

      /* Highlight clicked elements */
      .html-preview-content .preview-highlighted {
        outline: 2px solid #3b82f6;
        outline-offset: 2px;
        background-color: rgba(59, 130, 246, 0.1);
      }

      /* Form elements */
      .html-preview-content input,
      .html-preview-content textarea,
      .html-preview-content select {
        padding: 0.5rem;
        border: 1px solid #d1d5db;
        border-radius: 0.375rem;
        font-size: 0.875rem;
      }

      .html-preview-content input:focus,
      .html-preview-content textarea:focus,
      .html-preview-content select:focus {
        outline: 2px solid #3b82f6;
        outline-offset: -2px;
        border-color: #3b82f6;
      }
    `;
  }

  // Public API methods

  getHtml(): string {
    return this.currentHtml;
  }

  setHtml(html: string): void {
    this.currentHtml = html;
    this.updateContent();
  }

  getPreviewContainer(): HTMLDivElement {
    return this.previewContent;
  }

  highlightElement(element: HTMLElement): void {
    // Remove previous highlights
    const highlighted = this.previewContent.querySelectorAll(
      '.preview-highlighted',
    );
    highlighted.forEach((el) => el.classList.remove('preview-highlighted'));

    // Add highlight to target element
    if (element && this.previewContent.contains(element)) {
      element.classList.add('preview-highlighted');
    }
  }

  clearHighlights(): void {
    const highlighted = this.previewContent.querySelectorAll(
      '.preview-highlighted',
    );
    highlighted.forEach((el) => el.classList.remove('preview-highlighted'));
  }

  scrollToElement(element: HTMLElement): void {
    if (element && this.previewContent.contains(element)) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  getElementAt(x: number, y: number): Element | null {
    const rect = this.previewContainer.getBoundingClientRect();
    const elementX = x - rect.left;
    const elementY = y - rect.top;

    // Use document.elementFromPoint with adjusted coordinates
    return document.elementFromPoint(elementX + rect.left, elementY + rect.top);
  }
}
