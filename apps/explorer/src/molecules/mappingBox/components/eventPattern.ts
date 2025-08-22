/**
 * Event Pattern Component
 * Side-by-side entity and action selectors with autocomplete
 */

import { createElement } from '../../../lib/dom';
import { MappingModel } from '../model';
import type { EventPatternConfig } from '../types';

export interface EventPatternOptions {
  model: MappingModel;
  readOnly?: boolean;
}

export interface EventPatternAPI {
  refresh(): void;
  destroy(): void;
}

// Predefined event patterns for smart suggestions
const EVENT_PATTERNS: Record<string, string[]> = {
  page: ['view', 'leave', 'scroll', 'load', 'unload'],
  product: ['view', 'add', 'remove', 'click', 'select', 'wishlist'],
  user: ['login', 'logout', 'signup', 'update', 'delete', 'verify'],
  order: ['complete', 'cancel', 'update', 'refund', 'ship', 'deliver'],
  cart: ['view', 'add', 'remove', 'update', 'clear', 'abandon'],
  form: ['view', 'submit', 'error', 'abandon', 'complete', 'focus'],
  search: ['query', 'results', 'click', 'filter', 'sort'],
  video: ['play', 'pause', 'complete', 'progress', 'seek', 'error'],
  download: ['start', 'complete', 'error', 'cancel'],
  button: ['click', 'hover', 'focus'],
  link: ['click', 'hover'],
  newsletter: ['subscribe', 'unsubscribe', 'confirm'],
  payment: ['start', 'complete', 'error', 'method'],
  session: ['start', 'end', 'extend', 'expire'],
  error: ['404', '500', 'javascript', 'api', 'validation'],
};

// Get all unique entities
const ALL_ENTITIES = Object.keys(EVENT_PATTERNS).sort();

// Get all unique actions
const ALL_ACTIONS = Array.from(
  new Set(Object.values(EVENT_PATTERNS).flat()),
).sort();

export function createEventPattern(
  container: HTMLElement,
  options: EventPatternOptions,
): EventPatternAPI {
  const { model, readOnly } = options;

  let entityInput: HTMLInputElement;
  let actionInput: HTMLInputElement;
  let entityDropdown: HTMLElement;
  let actionDropdown: HTMLElement;
  let currentEntity: string = '';
  let currentAction: string = '';

  function render(): void {
    container.innerHTML = '';

    const pattern = model.getEventPattern();
    currentEntity = pattern.entity || '';
    currentAction = pattern.action || '';

    // Create wrapper with inline layout
    const wrapper = createElement('div', {
      class: 'elb-event-pattern',
    });

    // Create input row
    const inputRow = createElement('div', {
      class: 'elb-event-pattern-row',
    });

    // Entity input wrapper
    const entityWrapper = createElement('div', {
      class: 'elb-event-pattern-field',
    });

    entityInput = createElement('input', {
      type: 'text',
      class: 'elb-event-pattern-input',
      placeholder: 'Entity (e.g., product)',
      value: currentEntity,
      disabled: readOnly ? 'true' : undefined,
      autocomplete: 'off',
    }) as HTMLInputElement;

    // Entity dropdown
    entityDropdown = createElement('div', {
      class: 'elb-event-pattern-dropdown',
      style: 'display: none;',
    });

    // Status indicator for entity
    const entityStatus = createElement('span', {
      class: 'elb-event-pattern-status',
    });
    updateStatusIndicator(entityStatus, currentEntity, currentAction);

    entityWrapper.appendChild(entityInput);
    entityWrapper.appendChild(entityStatus);
    entityWrapper.appendChild(entityDropdown);

    // Action input wrapper
    const actionWrapper = createElement('div', {
      class: 'elb-event-pattern-field',
    });

    actionInput = createElement('input', {
      type: 'text',
      class: 'elb-event-pattern-input',
      placeholder: 'Action (e.g., view)',
      value: currentAction,
      disabled: readOnly ? 'true' : undefined,
      autocomplete: 'off',
    }) as HTMLInputElement;

    // Action dropdown
    actionDropdown = createElement('div', {
      class: 'elb-event-pattern-dropdown',
      style: 'display: none;',
    });

    actionWrapper.appendChild(actionInput);
    actionWrapper.appendChild(actionDropdown);

    // Remove button
    const removeButton = createElement('button', {
      class: 'elb-event-pattern-remove',
      title: 'Delete this mapping',
      disabled: readOnly ? 'true' : undefined,
    });
    removeButton.innerHTML = '×';

    // Add to row
    inputRow.appendChild(entityWrapper);
    inputRow.appendChild(actionWrapper);
    if (currentEntity && currentAction) {
      inputRow.appendChild(removeButton);
    }

    // Add event info
    const eventInfo = createElement('div', {
      class: 'elb-event-pattern-info',
    });
    updateEventInfo(eventInfo);

    // Add to wrapper
    wrapper.appendChild(inputRow);
    wrapper.appendChild(eventInfo);
    container.appendChild(wrapper);

    // Add event listeners if not readonly
    if (!readOnly) {
      setupEntityInput();
      setupActionInput();
      setupRemoveButton(removeButton);
    }

    // Add styles
    addStyles();
  }

  function setupEntityInput(): void {
    // Show dropdown on focus
    entityInput.addEventListener('focus', () => {
      showEntitySuggestions();
    });

    // Filter on input
    entityInput.addEventListener('input', () => {
      const value = entityInput.value.toLowerCase();
      currentEntity = entityInput.value;
      showEntitySuggestions(value);

      // Update actions based on entity
      if (EVENT_PATTERNS[value]) {
        updateActionSuggestions(value);
      }
    });

    // Hide dropdown on blur (with delay for click)
    entityInput.addEventListener('blur', () => {
      setTimeout(() => {
        entityDropdown.style.display = 'none';
        // Auto-create mapping if both fields are filled
        tryAutoCreateMapping();
      }, 200);
    });

    // Auto-create on Enter
    entityInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        entityDropdown.style.display = 'none';
        actionInput.focus();
        tryAutoCreateMapping();
      }
    });
  }

  function setupActionInput(): void {
    // Show dropdown on focus
    actionInput.addEventListener('focus', () => {
      showActionSuggestions();
    });

    // Filter on input
    actionInput.addEventListener('input', () => {
      const value = actionInput.value.toLowerCase();
      currentAction = actionInput.value;
      showActionSuggestions(value);
    });

    // Hide dropdown on blur (with delay for click)
    actionInput.addEventListener('blur', () => {
      setTimeout(() => {
        actionDropdown.style.display = 'none';
        // Auto-create mapping if both fields are filled
        tryAutoCreateMapping();
      }, 200);
    });

    // Auto-create on Enter
    actionInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        actionDropdown.style.display = 'none';
        tryAutoCreateMapping();
      }
    });

    // Save on change (kept for compatibility)
    actionInput.addEventListener('change', () => {
      tryAutoCreateMapping();
    });
  }

  function setupRemoveButton(button: HTMLButtonElement): void {
    if (!button) return;

    button.addEventListener('click', () => {
      if (confirm(`Delete mapping for "${currentEntity} ${currentAction}"?`)) {
        // Delete the specific mapping
        model.deleteMapping(currentEntity, currentAction);

        // Clear inputs
        entityInput.value = '';
        actionInput.value = '';
        currentEntity = '';
        currentAction = '';

        // Re-render to hide remove button and update UI
        render();
      }
    });
  }

  function tryAutoCreateMapping(): void {
    if (!currentEntity.trim() || !currentAction.trim()) {
      return; // Both fields must be filled
    }

    // Update current values from inputs
    currentEntity = entityInput.value.trim();
    currentAction = actionInput.value.trim();

    if (currentEntity && currentAction) {
      // Check if we should switch to existing mapping or create new
      if (model.hasMapping(currentEntity, currentAction)) {
        model.switchToMapping(currentEntity, currentAction);
      } else {
        model.setEventPattern(currentEntity, currentAction);
      }

      // Update UI
      updateEventInfo(container.querySelector('.elb-event-pattern-info'));
      updateStatusIndicator(
        container.querySelector('.elb-event-pattern-status'),
        currentEntity,
        currentAction,
      );

      // Re-render to show remove button if it's not visible
      if (!container.querySelector('.elb-event-pattern-remove')) {
        render();
      }
    }
  }

  function showEntitySuggestions(filter?: string): void {
    entityDropdown.innerHTML = '';

    // Get existing patterns
    const existingPatterns = model.getAllEventPatterns();
    const existingEntities = [
      ...new Set(existingPatterns.map((p) => p.entity)),
    ];

    // Combine with predefined entities
    const allEntities = [
      ...new Set([...existingEntities, ...ALL_ENTITIES]),
    ].sort();

    // Filter if needed
    const filtered = filter
      ? allEntities.filter((e) => e.toLowerCase().includes(filter))
      : allEntities;

    if (filtered.length === 0) {
      entityDropdown.style.display = 'none';
      return;
    }

    // Add items
    filtered.slice(0, 10).forEach((entity) => {
      const item = createElement('div', {
        class: 'elb-event-pattern-dropdown-item',
      });

      // Add indicator if has existing mappings
      const hasMapping = existingEntities.includes(entity);
      if (hasMapping) {
        const dot = createElement('span', {
          class: 'elb-event-pattern-dot',
        });
        item.appendChild(dot);
      }

      const text = createElement('span');
      text.textContent = entity;
      item.appendChild(text);

      // Add count of actions
      const count = existingPatterns.filter((p) => p.entity === entity).length;
      if (count > 0) {
        const badge = createElement('span', {
          class: 'elb-event-pattern-badge',
        });
        badge.textContent = count.toString();
        item.appendChild(badge);
      }

      item.addEventListener('click', () => {
        entityInput.value = entity;
        currentEntity = entity;
        entityDropdown.style.display = 'none';

        // Update action suggestions
        updateActionSuggestions(entity);
        actionInput.focus();
      });

      entityDropdown.appendChild(item);
    });

    entityDropdown.style.display = 'block';
  }

  function showActionSuggestions(filter?: string): void {
    actionDropdown.innerHTML = '';

    // Get suggestions based on entity
    const entityActions = EVENT_PATTERNS[currentEntity] || [];
    const existingActions = model.getAvailableActions(currentEntity);

    // Combine all suggestions
    const allActions = [
      ...new Set([...entityActions, ...existingActions, ...ALL_ACTIONS]),
    ];

    // Filter if needed
    const filtered = filter
      ? allActions.filter((a) => a.toLowerCase().includes(filter))
      : allActions;

    if (filtered.length === 0) {
      actionDropdown.style.display = 'none';
      return;
    }

    // Add items
    filtered.slice(0, 10).forEach((action) => {
      const item = createElement('div', {
        class: 'elb-event-pattern-dropdown-item',
      });

      // Add indicator if mapping exists
      const hasMapping = model.hasMapping(currentEntity, action);
      if (hasMapping) {
        const dot = createElement('span', {
          class: 'elb-event-pattern-dot elb-event-pattern-dot--exists',
        });
        item.appendChild(dot);
      }

      const text = createElement('span');
      text.textContent = action;
      item.appendChild(text);

      // Show if it's a recommended action for this entity
      if (entityActions.includes(action)) {
        const star = createElement('span', {
          class: 'elb-event-pattern-star',
        });
        star.textContent = '★';
        item.appendChild(star);
      }

      item.addEventListener('click', () => {
        actionInput.value = action;
        currentAction = action;
        actionDropdown.style.display = 'none';

        // Trigger change to save/load mapping
        actionInput.dispatchEvent(new Event('change'));
      });

      actionDropdown.appendChild(item);
    });

    actionDropdown.style.display = 'block';
  }

  function updateActionSuggestions(entity: string): void {
    // Clear action if switching entities
    if (entity !== currentEntity.split(' ')[0]) {
      actionInput.value = '';
      currentAction = '';
    }

    // Update placeholder with suggestions
    const suggestions = EVENT_PATTERNS[entity];
    if (suggestions && suggestions.length > 0) {
      actionInput.placeholder = `Action (e.g., ${suggestions[0]})`;
    } else {
      actionInput.placeholder = 'Action (e.g., view)';
    }
  }

  function updateEventInfo(element: HTMLElement | null): void {
    if (!element) return;

    if (currentEntity && currentAction) {
      const hasMapping = model.hasMapping(currentEntity, currentAction);
      element.innerHTML = `
        <span class="elb-event-pattern-event">
          ${currentEntity} ${currentAction}
        </span>
        <span class="elb-event-pattern-mapping-status">
          ${hasMapping ? '(existing mapping)' : '(new mapping)'}
        </span>
      `;
    } else {
      element.innerHTML = `
        <span class="elb-event-pattern-hint">
          Type or select an entity and action to configure mapping
        </span>
      `;
    }
  }

  function updateStatusIndicator(
    element: HTMLElement | null,
    entity: string,
    action: string,
  ): void {
    if (!element) return;

    if (entity && action && model.hasMapping(entity, action)) {
      element.className =
        'elb-event-pattern-status elb-event-pattern-status--exists';
      element.title = 'Mapping exists';
    } else {
      element.className = 'elb-event-pattern-status';
      element.title = '';
    }
  }

  function addStyles(): void {
    const styleId = 'elb-event-pattern-enhanced-styles';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .elb-event-pattern {
        display: flex;
        flex-direction: column;
        gap: var(--elb-spacing-sm);
      }
      
      .elb-event-pattern-row {
        display: flex;
        gap: var(--elb-spacing-sm);
        align-items: center;
      }
      
      .elb-event-pattern-field {
        position: relative;
        flex: 1;
      }
      
      .elb-event-pattern-input {
        width: 100%;
        padding: var(--elb-spacing-sm) var(--elb-spacing-md);
        padding-right: 30px;
        border: 1px solid var(--elb-border);
        border-radius: var(--elb-radius-sm);
        background: var(--elb-bg);
        color: var(--elb-fg);
        font-size: var(--elb-font-size-base);
        font-family: var(--elb-font-mono);
        transition: all var(--elb-transition-fast);
      }
      
      .elb-event-pattern-input:focus {
        outline: none;
        border-color: var(--elb-accent);
        box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.1);
      }
      
      .elb-event-pattern-status {
        position: absolute;
        right: 10px;
        top: 50%;
        transform: translateY(-50%);
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: transparent;
        transition: all var(--elb-transition-fast);
      }
      
      .elb-event-pattern-status--exists {
        background: #10b981;
        box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.2);
      }
      
      .elb-event-pattern-dropdown {
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        margin-top: 4px;
        background: var(--elb-surface);
        border: 1px solid var(--elb-border);
        border-radius: var(--elb-radius-sm);
        box-shadow: var(--elb-shadow-lg);
        max-height: 200px;
        overflow-y: auto;
        z-index: 1000;
      }
      
      .elb-event-pattern-dropdown-item {
        display: flex;
        align-items: center;
        gap: var(--elb-spacing-sm);
        padding: var(--elb-spacing-sm) var(--elb-spacing-md);
        cursor: pointer;
        transition: background var(--elb-transition-fast);
        font-size: var(--elb-font-size-sm);
        font-family: var(--elb-font-mono);
      }
      
      .elb-event-pattern-dropdown-item:hover {
        background: var(--elb-hover);
      }
      
      .elb-event-pattern-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: var(--elb-muted);
        flex-shrink: 0;
      }
      
      .elb-event-pattern-dot--exists {
        background: #10b981;
      }
      
      .elb-event-pattern-badge {
        margin-left: auto;
        padding: 2px 6px;
        background: var(--elb-hover);
        border-radius: 10px;
        font-size: var(--elb-font-size-xs);
        color: var(--elb-muted);
      }
      
      .elb-event-pattern-star {
        margin-left: auto;
        color: #f59e0b;
        font-size: var(--elb-font-size-xs);
      }
      
      .elb-event-pattern-info {
        padding: var(--elb-spacing-xs) var(--elb-spacing-sm);
        background: var(--elb-hover);
        border-radius: var(--elb-radius-sm);
        font-size: var(--elb-font-size-sm);
      }
      
      .elb-event-pattern-event {
        font-family: var(--elb-font-mono);
        font-weight: 500;
        color: var(--elb-accent);
      }
      
      .elb-event-pattern-mapping-status {
        color: var(--elb-muted);
        margin-left: var(--elb-spacing-sm);
        font-size: var(--elb-font-size-xs);
      }
      
      .elb-event-pattern-hint {
        color: var(--elb-muted);
        font-style: italic;
      }
      
      .elb-event-pattern-remove {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        margin-left: var(--elb-spacing-sm);
        background: transparent;
        border: 1px solid var(--elb-border);
        border-radius: var(--elb-radius-sm);
        color: var(--elb-error);
        cursor: pointer;
        font-size: 18px;
        font-weight: bold;
        transition: all var(--elb-transition-fast);
        flex-shrink: 0;
      }
      
      .elb-event-pattern-remove:hover:not(:disabled) {
        background: var(--elb-error);
        color: white;
        border-color: var(--elb-error);
      }
      
      .elb-event-pattern-remove:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    `;
    document.head.appendChild(style);
  }

  // Initial render
  render();

  // API
  return {
    refresh(): void {
      render();
    },

    destroy(): void {
      container.innerHTML = '';
    },
  };
}
