/**
 * Shared header component for consistent styling across all components
 */

export interface HeaderAction {
  id: string;
  icon: string; // SVG string
  title: string;
  onClick: () => void;
  disabled?: boolean;
}

export interface SharedHeaderOptions {
  label?: string;
  showLabel?: boolean;
  actions?: HeaderAction[];
  theme?: 'light' | 'dark';
  className?: string;
}

export class SharedHeader {
  private container!: HTMLDivElement;
  private options: Required<SharedHeaderOptions>;
  private actionButtons: Map<string, HTMLButtonElement> = new Map();

  constructor(
    private createElement: <K extends keyof HTMLElementTagNameMap>(
      tagName: K,
      attrs?: Record<string, string>,
      styles?: Partial<CSSStyleDeclaration>,
    ) => HTMLElementTagNameMap[K],
  ) {
    this.options = {
      label: '',
      showLabel: true,
      actions: [],
      theme: 'light',
      className: '',
    };
  }

  create(options: SharedHeaderOptions): HTMLDivElement {
    this.options = { ...this.options, ...options };

    this.container = this.createElement(
      'div',
      { class: `shared-header ${this.options.className}` },
      {
        display: 'flex',
        justifyContent: this.options.showLabel ? 'space-between' : 'flex-end',
        alignItems: 'center',
        padding: '8px 12px',
        borderBottom: '1px solid #e5e7eb',
        backgroundColor: this.options.theme === 'dark' ? '#374151' : '#f9fafb',
        minHeight: '40px',
        boxSizing: 'border-box',
      },
    ) as HTMLDivElement;

    if (this.options.showLabel && this.options.label) {
      this.createLabel();
    }

    if (this.options.actions && this.options.actions.length > 0) {
      this.createActionButtons();
    }

    return this.container;
  }

  private createLabel(): void {
    const label = this.createElement(
      'span',
      { class: 'shared-header-label' },
      {
        fontSize: '14px',
        fontWeight: '600',
        color: this.options.theme === 'dark' ? '#f3f4f6' : '#1f2937',
        margin: '0',
      },
    );
    label.textContent = this.options.label;
    this.container.appendChild(label);
  }

  private createActionButtons(): void {
    const actionsContainer = this.createElement(
      'div',
      { class: 'shared-header-actions' },
      {
        display: 'flex',
        gap: '6px',
        alignItems: 'center',
      },
    ) as HTMLDivElement;

    this.options.actions.forEach((action) => {
      const button = this.createElement(
        'button',
        {
          class: `shared-header-btn shared-header-btn-${action.id}`,
          type: 'button',
          title: action.title,
        },
        this.getButtonStyles(),
      ) as HTMLButtonElement;

      button.innerHTML = action.icon;
      button.disabled = action.disabled || false;

      button.addEventListener('click', action.onClick);

      this.actionButtons.set(action.id, button);
      actionsContainer.appendChild(button);
    });

    this.container.appendChild(actionsContainer);
  }

  private getButtonStyles(): Partial<CSSStyleDeclaration> {
    return {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '28px',
      height: '28px',
      padding: '0',
      border: '1px solid #d1d5db',
      borderRadius: '4px',
      backgroundColor: 'transparent',
      color: this.options.theme === 'dark' ? '#d1d5db' : '#6b7280',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      fontSize: '0', // Hide any text, show only SVG
    };
  }

  updateLabel(label: string): void {
    this.options.label = label;
    const labelElement = this.container.querySelector('.shared-header-label');
    if (labelElement) {
      labelElement.textContent = label;
    }
  }

  updateAction(actionId: string, updates: Partial<HeaderAction>): void {
    const button = this.actionButtons.get(actionId);
    if (!button) return;

    if (updates.icon !== undefined) {
      button.innerHTML = updates.icon;
    }
    if (updates.title !== undefined) {
      button.title = updates.title;
    }
    if (updates.disabled !== undefined) {
      button.disabled = updates.disabled;
    }
    if (updates.onClick !== undefined) {
      // Remove old listener and add new one
      const newButton = button.cloneNode(true) as HTMLButtonElement;
      newButton.addEventListener('click', updates.onClick);
      button.parentNode?.replaceChild(newButton, button);
      this.actionButtons.set(actionId, newButton);
    }
  }

  getButton(actionId: string): HTMLButtonElement | undefined {
    return this.actionButtons.get(actionId);
  }

  static getDefaultCSS(theme: 'light' | 'dark' = 'light'): string {
    return `
      .shared-header {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        box-sizing: border-box;
      }

      .shared-header * {
        box-sizing: border-box;
      }

      .shared-header-btn:hover:not(:disabled) {
        background-color: ${theme === 'dark' ? '#4b5563' : '#f3f4f6'};
        border-color: ${theme === 'dark' ? '#6b7280' : '#9ca3af'};
      }

      .shared-header-btn:active:not(:disabled) {
        transform: scale(0.95);
      }

      .shared-header-btn:focus {
        outline: 2px solid #3b82f6;
        outline-offset: 2px;
      }

      .shared-header-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .shared-header-btn:disabled:hover {
        background-color: transparent;
        border-color: #d1d5db;
      }

      /* Responsive adjustments */
      @media (max-width: 768px) {
        .shared-header {
          flex-direction: column;
          gap: 8px;
          align-items: stretch;
        }

        .shared-header-actions {
          justify-content: flex-end;
        }
      }
    `;
  }
}

// Common icon library
export const ICONS = {
  copy: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
  </svg>`,

  check: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <polyline points="20,6 9,17 4,12"></polyline>
  </svg>`,

  reset: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <polyline points="1 4 1 10 7 10"></polyline>
    <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
  </svg>`,

  fullscreen: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path>
  </svg>`,

  format: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <polyline points="4 7 4 4 20 4 20 7"></polyline>
    <line x1="9" y1="20" x2="15" y2="20"></line>
    <line x1="12" y1="4" x2="12" y2="20"></line>
  </svg>`,
};
