/**
 * Unified Container Component
 *
 * A reusable container system that provides:
 * - Consistent theming across all components
 * - Standardized layouts (header + content)
 * - Theme management
 * - Responsive design
 * - Clean, modern styling
 */

export interface UnifiedContainerOptions {
  theme?: 'light' | 'dark';
  className?: string;
  variant?: 'default' | 'bordered' | 'elevated' | 'flat';
  size?: 'small' | 'medium' | 'large';
  fullHeight?: boolean;
  padding?: string;
  gap?: string;
}

export class UnifiedContainer {
  private element: HTMLDivElement | null = null;
  private options: Required<UnifiedContainerOptions>;

  constructor(
    private createElement: (
      tag: string,
      attrs?: Record<string, string>,
      styles?: Record<string, string>,
    ) => HTMLElement,
  ) {
    // Default options
    this.options = {
      theme: 'light',
      className: '',
      variant: 'default',
      size: 'medium',
      fullHeight: false,
      padding: '',
      gap: '',
    };
  }

  create(options: UnifiedContainerOptions = {}): HTMLDivElement {
    this.options = { ...this.options, ...options };

    this.element = this.createElement(
      'div',
      {
        class:
          `unified-container unified-container--${this.options.variant} unified-container--${this.options.size} ${this.options.className}`.trim(),
        'data-theme': this.options.theme,
      },
      {
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: this.getBackgroundColor(),
        border: this.getBorder(),
        borderRadius: this.getBorderRadius(),
        boxShadow: this.getBoxShadow(),
        overflow: 'hidden',
        height: this.options.fullHeight ? '100%' : 'auto',
        padding: this.options.padding || this.getDefaultPadding(),
        gap: this.options.gap || this.getDefaultGap(),
        transition: 'all 0.2s ease-in-out',
      },
    ) as HTMLDivElement;

    return this.element;
  }

  createSection(
    className: string = '',
    styles: Record<string, string> = {},
  ): HTMLDivElement {
    return this.createElement(
      'div',
      {
        class: `unified-container-section ${className}`.trim(),
      },
      {
        ...styles,
      },
    ) as HTMLDivElement;
  }

  createHeader(
    className: string = '',
    styles: Record<string, string> = {},
  ): HTMLDivElement {
    return this.createElement(
      'div',
      {
        class: `unified-container-header ${className}`.trim(),
      },
      {
        padding: '16px 20px',
        borderBottom: `1px solid ${this.getBorderColor()}`,
        backgroundColor: this.getHeaderBackgroundColor(),
        ...styles,
      },
    ) as HTMLDivElement;
  }

  createContent(
    className: string = '',
    styles: Record<string, string> = {},
  ): HTMLDivElement {
    return this.createElement(
      'div',
      {
        class: `unified-container-content ${className}`.trim(),
      },
      {
        flex: '1',
        minHeight: '0',
        padding: '20px',
        ...styles,
      },
    ) as HTMLDivElement;
  }

  createFooter(
    className: string = '',
    styles: Record<string, string> = {},
  ): HTMLDivElement {
    return this.createElement(
      'div',
      {
        class: `unified-container-footer ${className}`.trim(),
      },
      {
        padding: '16px 20px',
        borderTop: `1px solid ${this.getBorderColor()}`,
        backgroundColor: this.getHeaderBackgroundColor(),
        ...styles,
      },
    ) as HTMLDivElement;
  }

  // Theme-based styling methods
  private getBackgroundColor(): string {
    const colors = {
      light: {
        default: '#ffffff',
        bordered: '#ffffff',
        elevated: '#ffffff',
        flat: 'transparent',
      },
      dark: {
        default: '#1f2937',
        bordered: '#1f2937',
        elevated: '#1f2937',
        flat: 'transparent',
      },
    };
    return colors[this.options.theme][this.options.variant];
  }

  private getHeaderBackgroundColor(): string {
    const colors = {
      light: {
        default: '#f8fafc',
        bordered: '#f8fafc',
        elevated: '#f8fafc',
        flat: '#f8fafc',
      },
      dark: {
        default: '#374151',
        bordered: '#374151',
        elevated: '#374151',
        flat: '#374151',
      },
    };
    return colors[this.options.theme][this.options.variant];
  }

  private getBorderColor(): string {
    return this.options.theme === 'dark' ? '#374151' : '#e2e8f0';
  }

  private getBorder(): string {
    const borders = {
      light: {
        default: 'none',
        bordered: '1px solid #e2e8f0',
        elevated: 'none',
        flat: 'none',
      },
      dark: {
        default: 'none',
        bordered: '1px solid #374151',
        elevated: 'none',
        flat: 'none',
      },
    };
    return borders[this.options.theme][this.options.variant];
  }

  private getBorderRadius(): string {
    const radii = {
      default: '8px',
      bordered: '8px',
      elevated: '12px',
      flat: '0px',
    };
    return radii[this.options.variant];
  }

  private getBoxShadow(): string {
    const shadows = {
      light: {
        default: 'none',
        bordered: 'none',
        elevated:
          '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        flat: 'none',
      },
      dark: {
        default: 'none',
        bordered: 'none',
        elevated:
          '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2)',
        flat: 'none',
      },
    };
    return shadows[this.options.theme][this.options.variant];
  }

  private getDefaultPadding(): string {
    const paddings = {
      small: '12px',
      medium: '16px',
      large: '24px',
    };
    return paddings[this.options.size];
  }

  private getDefaultGap(): string {
    const gaps = {
      small: '8px',
      medium: '12px',
      large: '16px',
    };
    return gaps[this.options.size];
  }

  // Public methods for runtime updates
  setTheme(theme: 'light' | 'dark'): void {
    this.options.theme = theme;
    if (this.element) {
      this.element.setAttribute('data-theme', theme);

      // Update colors
      Object.assign(this.element.style, {
        backgroundColor: this.getBackgroundColor(),
        border: this.getBorder(),
        boxShadow: this.getBoxShadow(),
      });

      // Update header/footer sections
      const header = this.element.querySelector(
        '.unified-container-header',
      ) as HTMLElement;
      if (header) {
        Object.assign(header.style, {
          backgroundColor: this.getHeaderBackgroundColor(),
          borderBottomColor: this.getBorderColor(),
        });
      }

      const footer = this.element.querySelector(
        '.unified-container-footer',
      ) as HTMLElement;
      if (footer) {
        Object.assign(footer.style, {
          backgroundColor: this.getHeaderBackgroundColor(),
          borderTopColor: this.getBorderColor(),
        });
      }
    }
  }

  setVariant(variant: UnifiedContainerOptions['variant']): void {
    if (!variant) return;

    this.options.variant = variant;
    if (this.element) {
      // Update class names
      this.element.className = this.element.className.replace(
        /unified-container--\w+/g,
        `unified-container--${variant}`,
      );

      // Update styles
      Object.assign(this.element.style, {
        backgroundColor: this.getBackgroundColor(),
        border: this.getBorder(),
        borderRadius: this.getBorderRadius(),
        boxShadow: this.getBoxShadow(),
      });
    }
  }

  setSize(size: UnifiedContainerOptions['size']): void {
    if (!size) return;

    this.options.size = size;
    if (this.element) {
      // Update class names
      this.element.className = this.element.className.replace(
        /unified-container--\w+/g,
        `unified-container--${size}`,
      );

      // Update padding and gap if they weren't explicitly set
      if (!this.options.padding) {
        this.element.style.padding = this.getDefaultPadding();
      }
      if (!this.options.gap) {
        this.element.style.gap = this.getDefaultGap();
      }
    }
  }

  getElement(): HTMLDivElement | null {
    return this.element;
  }

  destroy(): void {
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
    this.element = null;
  }

  // Static method to create CSS utilities
  static getGlobalStyles(theme: 'light' | 'dark' = 'light'): string {
    return `
      /* Unified Container Global Styles */
      .unified-container {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        box-sizing: border-box;
      }

      .unified-container *,
      .unified-container *::before,
      .unified-container *::after {
        box-sizing: border-box;
      }

      /* Size variants */
      .unified-container--small {
        font-size: 13px;
      }

      .unified-container--medium {
        font-size: 14px;
      }

      .unified-container--large {
        font-size: 16px;
      }

      /* Scrollbar styling */
      .unified-container *::-webkit-scrollbar {
        width: 8px;
        height: 8px;
      }

      .unified-container *::-webkit-scrollbar-track {
        background: ${theme === 'dark' ? '#374151' : '#f1f5f9'};
      }

      .unified-container *::-webkit-scrollbar-thumb {
        background: ${theme === 'dark' ? '#6b7280' : '#cbd5e1'};
        border-radius: 4px;
      }

      .unified-container *::-webkit-scrollbar-thumb:hover {
        background: ${theme === 'dark' ? '#9ca3af' : '#94a3b8'};
      }

      /* Focus styles */
      .unified-container *:focus {
        outline: 2px solid ${theme === 'dark' ? '#3b82f6' : '#3b82f6'};
        outline-offset: 2px;
      }

      .unified-container *:focus:not(:focus-visible) {
        outline: none;
      }

      /* Animation utilities */
      .unified-container--animated {
        animation: unified-fade-in 0.2s ease-out;
      }

      @keyframes unified-fade-in {
        from {
          opacity: 0;
          transform: translateY(-4px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      /* Responsive utilities */
      @media (max-width: 768px) {
        .unified-container--large {
          font-size: 14px;
        }
        
        .unified-container-header,
        .unified-container-footer {
          padding: 12px 16px !important;
        }
        
        .unified-container-content {
          padding: 16px !important;
        }
      }
    `;
  }
}
