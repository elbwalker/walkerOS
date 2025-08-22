/**
 * Entity Action Selector Component
 * Smart dropdown interface for entity and action selection
 */

import { createElement } from '../../../lib/dom';
import { getId } from '@walkeros/core';
import { MappingModel } from '../model';

export interface EntityActionSelectorOptions {
  model: MappingModel;
  readOnly?: boolean;
  onSelectionChange?: (entity: string, action: string) => void;
}

export interface EntityActionSelectorAPI {
  getSelection(): { entity: string; action: string };
  setSelection(entity: string, action: string): void;
  refresh(): void;
  destroy(): void;
}

// Common walkerOS entities and actions
const COMMON_ENTITIES = [
  'page',
  'product',
  'order',
  'user',
  'session',
  'form',
  'button',
  'link',
  'video',
  'download',
  'search',
  'cart',
  'category',
  'promotion',
];

const COMMON_ACTIONS = [
  'view',
  'click',
  'add',
  'remove',
  'complete',
  'start',
  'stop',
  'login',
  'logout',
  'signup',
  'submit',
  'load',
  'error',
  'share',
  'favorite',
];

export function createEntityActionSelector(
  container: HTMLElement,
  options: EntityActionSelectorOptions,
): EntityActionSelectorAPI {
  const { model, readOnly = false, onSelectionChange } = options;

  let currentEntity = '';
  let currentAction = '';
  let entityDropdown: HTMLElement;
  let actionDropdown: HTMLElement;

  function render(): void {
    container.innerHTML = '';

    // Create wrapper
    const wrapper = createElement('div', {
      class: 'elb-entity-action-selector',
    });

    // Create entity selector
    const entitySection = createElement('div', {
      class: 'elb-selector-section',
    });

    const entityLabel = createElement('label', {
      class: 'elb-selector-label',
    });
    entityLabel.textContent = 'Entity';

    entityDropdown = createSmartDropdown({
      placeholder: 'Select entity...',
      options: COMMON_ENTITIES,
      value: currentEntity,
      allowCustom: true,
      onChange: (value) => {
        currentEntity = value;
        updateModel();
        if (onSelectionChange) {
          onSelectionChange(currentEntity, currentAction);
        }
      },
      disabled: readOnly,
    });

    entitySection.appendChild(entityLabel);
    entitySection.appendChild(entityDropdown);

    // Create action selector
    const actionSection = createElement('div', {
      class: 'elb-selector-section',
    });

    const actionLabel = createElement('label', {
      class: 'elb-selector-label',
    });
    actionLabel.textContent = 'Action';

    actionDropdown = createSmartDropdown({
      placeholder: 'Select action...',
      options: COMMON_ACTIONS,
      value: currentAction,
      allowCustom: true,
      onChange: (value) => {
        currentAction = value;
        updateModel();
        if (onSelectionChange) {
          onSelectionChange(currentEntity, currentAction);
        }
      },
      disabled: readOnly,
    });

    actionSection.appendChild(actionLabel);
    actionSection.appendChild(actionDropdown);

    // Add sections to wrapper
    wrapper.appendChild(entitySection);
    wrapper.appendChild(actionSection);

    container.appendChild(wrapper);

    // Add styles
    addStyles();
  }

  function createSmartDropdown(config: {
    placeholder: string;
    options: string[];
    value: string;
    allowCustom: boolean;
    onChange: (value: string) => void;
    disabled: boolean;
  }): HTMLElement {
    const dropdownId = getId(8);
    const dropdown = createElement('div', {
      class: 'elb-smart-dropdown',
      'data-dropdown-id': dropdownId,
    });

    // Input field
    const input = createElement('input', {
      type: 'text',
      class: 'elb-smart-dropdown-input',
      placeholder: config.placeholder,
      value: config.value,
      disabled: config.disabled ? 'true' : undefined,
    }) as HTMLInputElement;

    // Options container
    const optionsContainer = createElement('div', {
      class: 'elb-smart-dropdown-options',
      style: 'display: none;',
    });

    // Create options
    config.options.forEach((option) => {
      const optionEl = createElement('div', {
        class: 'elb-smart-dropdown-option',
        'data-value': option,
      });
      optionEl.textContent = option;
      optionEl.onclick = () => {
        input.value = option;
        config.onChange(option);
        hideOptions();
      };
      optionsContainer.appendChild(optionEl);
    });

    // Add wildcard option
    const wildcardOption = createElement('div', {
      class: 'elb-smart-dropdown-option elb-smart-dropdown-wildcard',
      'data-value': '*',
    });
    wildcardOption.innerHTML = '<strong>*</strong> <span>Any (wildcard)</span>';
    wildcardOption.onclick = () => {
      input.value = '*';
      config.onChange('*');
      hideOptions();
    };
    optionsContainer.appendChild(wildcardOption);

    function showOptions(): void {
      if (config.disabled) return;
      optionsContainer.style.display = 'block';
      dropdown.classList.add('elb-smart-dropdown--open');
    }

    function hideOptions(): void {
      optionsContainer.style.display = 'none';
      dropdown.classList.remove('elb-smart-dropdown--open');
    }

    function filterOptions(query: string): void {
      const options = optionsContainer.querySelectorAll(
        '.elb-smart-dropdown-option',
      );
      const lowerQuery = query.toLowerCase();

      options.forEach((option) => {
        const value = option.getAttribute('data-value') || '';
        const visible =
          value.toLowerCase().includes(lowerQuery) || value === '*';
        (option as HTMLElement).style.display = visible ? 'block' : 'none';
      });
    }

    // Input events
    input.onfocus = showOptions;
    input.oninput = (e) => {
      const value = (e.target as HTMLInputElement).value;
      filterOptions(value);
      showOptions();
    };

    input.onblur = (e) => {
      // Delay hiding to allow option clicks
      setTimeout(() => {
        hideOptions();
        if (config.allowCustom) {
          config.onChange(input.value);
        }
      }, 150);
    };

    input.onkeydown = (e) => {
      if (e.key === 'Escape') {
        hideOptions();
        input.blur();
      } else if (e.key === 'Enter') {
        hideOptions();
        if (config.allowCustom) {
          config.onChange(input.value);
        }
      }
    };

    // Click outside to close
    document.addEventListener('click', (e) => {
      if (!dropdown.contains(e.target as Node)) {
        hideOptions();
      }
    });

    dropdown.appendChild(input);
    dropdown.appendChild(optionsContainer);

    return dropdown;
  }

  function updateModel(): void {
    if (currentEntity && currentAction) {
      // Add empty mapping rule if it doesn't exist
      const currentRules = model.toJSON();
      if (!currentRules[currentEntity]) {
        currentRules[currentEntity] = {};
      }
      if (!currentRules[currentEntity][currentAction]) {
        currentRules[currentEntity][currentAction] = {
          name: `${currentEntity}_${currentAction}`,
          data: { map: {} },
        };
        model.fromJSON(currentRules);
      }
    }
  }

  function addStyles(): void {
    const styleId = 'elb-entity-action-selector-styles';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .elb-entity-action-selector {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: var(--elb-spacing-md);
        padding: var(--elb-spacing-md);
        background: var(--elb-surface);
        border-radius: var(--elb-radius-md);
        border: 1px solid var(--elb-border);
        margin-bottom: var(--elb-spacing-md);
      }
      
      .elb-selector-section {
        display: flex;
        flex-direction: column;
        gap: var(--elb-spacing-xs);
      }
      
      .elb-selector-label {
        font-size: var(--elb-font-size-sm);
        font-weight: 500;
        color: var(--elb-fg);
        margin-bottom: var(--elb-spacing-xs);
      }
      
      .elb-smart-dropdown {
        position: relative;
        width: 100%;
      }
      
      .elb-smart-dropdown-input {
        width: 100%;
        padding: var(--elb-spacing-sm);
        border: 1px solid var(--elb-border);
        border-radius: var(--elb-radius-sm);
        background: var(--elb-surface);
        color: var(--elb-fg);
        font-size: var(--elb-font-size-sm);
        font-family: var(--elb-font-mono);
        transition: all var(--elb-transition-fast);
        outline: none;
      }
      
      .elb-smart-dropdown-input:focus {
        border-color: var(--elb-accent);
        box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.1);
      }
      
      .elb-smart-dropdown-input:disabled {
        background: var(--elb-hover);
        color: var(--elb-muted);
        cursor: not-allowed;
      }
      
      .elb-smart-dropdown--open .elb-smart-dropdown-input {
        border-bottom-left-radius: 0;
        border-bottom-right-radius: 0;
        border-bottom-color: transparent;
      }
      
      .elb-smart-dropdown-options {
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        background: var(--elb-surface);
        border: 1px solid var(--elb-border);
        border-top: none;
        border-bottom-left-radius: var(--elb-radius-sm);
        border-bottom-right-radius: var(--elb-radius-sm);
        box-shadow: var(--elb-shadow-md);
        max-height: 200px;
        overflow-y: auto;
        z-index: 1000;
      }
      
      .elb-smart-dropdown-option {
        padding: var(--elb-spacing-sm);
        cursor: pointer;
        font-size: var(--elb-font-size-sm);
        font-family: var(--elb-font-mono);
        color: var(--elb-fg);
        border-bottom: 1px solid var(--elb-border);
        transition: background-color var(--elb-transition-fast);
      }
      
      .elb-smart-dropdown-option:last-child {
        border-bottom: none;
        border-bottom-left-radius: var(--elb-radius-sm);
        border-bottom-right-radius: var(--elb-radius-sm);
      }
      
      .elb-smart-dropdown-option:hover {
        background: var(--elb-hover);
      }
      
      .elb-smart-dropdown-wildcard {
        background: rgba(37, 99, 235, 0.05);
        color: var(--elb-accent);
      }
      
      .elb-smart-dropdown-wildcard:hover {
        background: rgba(37, 99, 235, 0.1);
      }
      
      .elb-smart-dropdown-wildcard span {
        color: var(--elb-muted);
        font-size: var(--elb-font-size-xs);
      }
      
      .elb-smart-dropdown-options::-webkit-scrollbar {
        width: 4px;
      }
      
      .elb-smart-dropdown-options::-webkit-scrollbar-track {
        background: var(--elb-hover);
      }
      
      .elb-smart-dropdown-options::-webkit-scrollbar-thumb {
        background: var(--elb-border);
        border-radius: 2px;
      }
      
      @media (max-width: 640px) {
        .elb-entity-action-selector {
          grid-template-columns: 1fr;
        }
      }
    `;
    document.head.appendChild(style);
  }

  // Initial render
  render();

  return {
    getSelection(): { entity: string; action: string } {
      return { entity: currentEntity, action: currentAction };
    },

    setSelection(entity: string, action: string): void {
      currentEntity = entity;
      currentAction = action;

      // Update inputs
      const entityInput = entityDropdown.querySelector(
        '.elb-smart-dropdown-input',
      ) as HTMLInputElement;
      const actionInput = actionDropdown.querySelector(
        '.elb-smart-dropdown-input',
      ) as HTMLInputElement;

      if (entityInput) entityInput.value = entity;
      if (actionInput) actionInput.value = action;

      updateModel();
    },

    refresh(): void {
      render();
    },

    destroy(): void {
      container.innerHTML = '';
    },
  };
}
