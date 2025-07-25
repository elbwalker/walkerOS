/**
 * Unified Header Component - CSS Theme Based
 *
 * Uses CSS custom properties for theming instead of JavaScript.
 * Simplified without toolbar functionality.
 */

export interface HeaderAction {
  id: string;
  icon: string;
  title: string;
  onClick: () => void;
  disabled?: boolean;
  hidden?: boolean;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
}

export interface UnifiedHeaderOptions {
  title?: string;
  showTitle?: boolean;
  actions?: HeaderAction[];
  className?: string;
  compact?: boolean;
}

export class UnifiedHeaderCSS {
  private element: HTMLDivElement | null = null;
  private actions: Map<string, HeaderAction> = new Map();
  private options: Required<UnifiedHeaderOptions>;

  constructor(
    private createElement: (
      tag: string,
      attrs?: Record<string, string>,
      styles?: Record<string, string>,
    ) => HTMLElement,
  ) {
    // Default options
    this.options = {
      title: '',
      showTitle: true,
      actions: [],
      className: '',
      compact: false,
    };
  }

  create(options: UnifiedHeaderOptions): HTMLDivElement {
    this.options = { ...this.options, ...options };

    // Store actions for easy access
    this.actions.clear();
    this.options.actions.forEach((action) => {
      this.actions.set(action.id, action);
    });

    this.element = this.createElement(
      'div',
      {
        class: `explorer-header ${this.options.className}`.trim(),
      },
      {
        padding: this.options.compact ? '8px 12px' : '12px 16px',
        minHeight: this.options.compact ? '32px' : '40px',
      },
    ) as HTMLDivElement;

    // Title section
    if (this.options.showTitle && this.options.title) {
      const titleElement = this.createElement('div', {
        class: 'explorer-header-title',
      });
      titleElement.textContent = this.options.title;
      this.element.appendChild(titleElement);
    }

    // Actions section
    if (this.options.actions.length > 0) {
      const actionsContainer = this.createElement(
        'div',
        {
          class: 'explorer-header-actions',
        },
        {
          gap: this.options.compact ? '4px' : '8px',
        },
      );

      this.options.actions.forEach((action) => {
        if (!action.hidden) {
          const button = this.createActionButton(action);
          actionsContainer.appendChild(button);
        }
      });

      this.element.appendChild(actionsContainer);
    }

    return this.element;
  }

  private createActionButton(action: HeaderAction): HTMLButtonElement {
    const variantClass = action.variant
      ? `explorer-button--${action.variant}`
      : '';

    const button = this.createElement(
      'button',
      {
        class: `explorer-button ${variantClass}`.trim(),
        title: action.title,
        'data-action': action.id,
        ...(action.disabled && { disabled: 'true' }),
      },
      {
        width: this.options.compact ? '24px' : '28px',
        height: this.options.compact ? '24px' : '28px',
      },
    ) as HTMLButtonElement;

    // Add icon
    button.innerHTML = action.icon;

    // Add click handler
    button.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!action.disabled) {
        action.onClick();
      }
    });

    return button;
  }

  // Public methods for runtime updates
  updateTitle(title: string): void {
    if (this.element) {
      const titleElement = this.element.querySelector('.explorer-header-title');
      if (titleElement) {
        titleElement.textContent = title;
      }
    }
    this.options.title = title;
  }

  updateAction(actionId: string, updates: Partial<HeaderAction>): void {
    const action = this.actions.get(actionId);
    if (action && this.element) {
      const updatedAction = { ...action, ...updates };
      this.actions.set(actionId, updatedAction);

      const button = this.element.querySelector(
        `[data-action="${actionId}"]`,
      ) as HTMLButtonElement;
      if (button) {
        // Update button properties
        if (updates.title) button.title = updates.title;
        if (updates.icon) button.innerHTML = updates.icon;
        if (updates.disabled !== undefined) {
          button.disabled = updates.disabled;
        }
        if (updates.hidden !== undefined) {
          button.style.display = updates.hidden ? 'none' : 'inline-flex';
        }

        // Update variant class
        if (updates.variant) {
          // Remove old variant classes
          button.className = button.className.replace(
            /explorer-button--\w+/g,
            '',
          );
          if (updates.variant !== 'default') {
            button.classList.add(`explorer-button--${updates.variant}`);
          }
        }
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
    this.actions.clear();
  }
}

// Simplified icon library - no format or toolbar icons
export const ICONS = {
  copy: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
    <path d="m5 15-2-2 7-7 2 2-7 7z"></path>
  </svg>`,

  play: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <polygon points="5,3 19,12 5,21"></polygon>
  </svg>`,

  reset: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <polyline points="23,4 23,10 17,10"></polyline>
    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
  </svg>`,

  close: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>`,

  settings: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <circle cx="12" cy="12" r="3"></circle>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1 1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
  </svg>`,

  check: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <polyline points="20,6 9,17 4,12"></polyline>
  </svg>`,

  warning: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
    <line x1="12" y1="9" x2="12" y2="13"></line>
    <line x1="12" y1="17" x2="12.01" y2="17"></line>
  </svg>`,
};
