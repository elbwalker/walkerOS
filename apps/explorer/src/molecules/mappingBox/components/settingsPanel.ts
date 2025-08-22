/**
 * Settings Panel Component
 * Configuration for name, consent, and conditions
 */

import { createElement } from '../../../lib/dom';
import { MappingModel } from '../model';
import type { WalkerOS } from '@walkeros/core';

export interface SettingsPanelOptions {
  model: MappingModel;
  readOnly?: boolean;
}

export interface SettingsPanelAPI {
  refresh(): void;
  destroy(): void;
}

export function createSettingsPanel(
  container: HTMLElement,
  options: SettingsPanelOptions,
): SettingsPanelAPI {
  const { model, readOnly } = options;

  // Common consent types
  const consentTypes = [
    'functional',
    'analytics',
    'marketing',
    'preferences',
    'statistics',
  ];

  function render(): void {
    container.innerHTML = '';

    const wrapper = createElement('div', {
      class: 'elb-settings-panel',
    });

    // Get current event data
    const eventKey = (model as any).findEventKey?.() || null;
    let eventData: any = {};

    if (eventKey) {
      const [entity, action] = eventKey.split('.');
      const data = model.toJSON();
      eventData = data[entity]?.[action] || {};
    }

    // Name mapping section
    const nameSection = createElement('div', {
      class: 'elb-settings-section',
    });

    const nameLabel = createElement('label', {
      class: 'elb-settings-label',
    });
    nameLabel.textContent = 'Event Name:';

    const nameInput = createElement('input', {
      type: 'text',
      class: 'elb-settings-input',
      value: eventData.name || '',
      placeholder: 'Destination event name (optional)',
      disabled: readOnly ? 'true' : undefined,
    }) as HTMLInputElement;

    nameInput.addEventListener('change', () => {
      if (nameInput.value) {
        model.setName(nameInput.value);
      }
    });

    nameSection.appendChild(nameLabel);
    nameSection.appendChild(nameInput);

    // Consent section
    const consentSection = createElement('div', {
      class: 'elb-settings-section',
    });

    const consentLabel = createElement('label', {
      class: 'elb-settings-label',
    });
    consentLabel.textContent = 'Required Consent:';

    const consentControls = createElement('div', {
      class: 'elb-settings-consent',
    });

    consentTypes.forEach((type) => {
      const checkboxWrapper = createElement('label', {
        class: 'elb-settings-checkbox-wrapper',
      });

      const checkbox = createElement('input', {
        type: 'checkbox',
        class: 'elb-settings-checkbox',
        value: type,
        checked: eventData.consent?.[type] ? 'true' : undefined,
        disabled: readOnly ? 'true' : undefined,
      }) as HTMLInputElement;

      checkbox.addEventListener('change', () => {
        updateConsent();
      });

      const checkboxLabel = createElement('span', {
        class: 'elb-settings-checkbox-label',
      });
      checkboxLabel.textContent = type;

      checkboxWrapper.appendChild(checkbox);
      checkboxWrapper.appendChild(checkboxLabel);
      consentControls.appendChild(checkboxWrapper);
    });

    consentSection.appendChild(consentLabel);
    consentSection.appendChild(consentControls);

    // Condition section
    const conditionSection = createElement('div', {
      class: 'elb-settings-section',
    });

    const conditionLabel = createElement('label', {
      class: 'elb-settings-label',
    });
    conditionLabel.textContent = 'Condition:';

    const conditionTextarea = createElement('textarea', {
      class: 'elb-settings-condition',
      placeholder:
        '// Optional condition function\n(event) => event.data.value > 100',
      disabled: readOnly ? 'true' : undefined,
    }) as HTMLTextAreaElement;

    if (eventData.condition) {
      conditionTextarea.value = eventData.condition.toString();
    }

    conditionTextarea.addEventListener('change', () => {
      // TODO: Parse and set condition function
      console.log('Condition editing not yet implemented');
    });

    conditionSection.appendChild(conditionLabel);
    conditionSection.appendChild(conditionTextarea);

    // Batch settings
    const batchSection = createElement('div', {
      class: 'elb-settings-section',
    });

    const batchLabel = createElement('label', {
      class: 'elb-settings-label',
    });
    batchLabel.textContent = 'Batch Size:';

    const batchInput = createElement('input', {
      type: 'number',
      class: 'elb-settings-input elb-settings-input--small',
      value: eventData.batch || '',
      placeholder: '0',
      min: '0',
      disabled: readOnly ? 'true' : undefined,
    }) as HTMLInputElement;

    batchInput.addEventListener('change', () => {
      // TODO: Set batch size
      console.log('Batch setting not yet implemented');
    });

    const batchHelp = createElement('span', {
      class: 'elb-settings-help',
    });
    batchHelp.textContent = '0 = no batching';

    batchSection.appendChild(batchLabel);
    batchSection.appendChild(batchInput);
    batchSection.appendChild(batchHelp);

    // Add sections to wrapper
    wrapper.appendChild(nameSection);
    wrapper.appendChild(consentSection);
    wrapper.appendChild(conditionSection);
    wrapper.appendChild(batchSection);

    container.appendChild(wrapper);

    // Add styles
    addStyles();
  }

  function updateConsent(): void {
    const checkboxes = container.querySelectorAll(
      '.elb-settings-checkbox:checked',
    );
    const consent: WalkerOS.Consent = {};

    checkboxes.forEach((checkbox: any) => {
      consent[checkbox.value] = true;
    });

    if (Object.keys(consent).length > 0) {
      model.setConsent(consent);
    }
  }

  function addStyles(): void {
    const styleId = 'elb-settings-panel-styles';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .elb-settings-panel {
        display: flex;
        flex-direction: column;
        gap: var(--elb-spacing-md);
      }
      
      .elb-settings-section {
        display: flex;
        flex-direction: column;
        gap: var(--elb-spacing-sm);
      }
      
      .elb-settings-label {
        font-size: var(--elb-font-size-sm);
        color: var(--elb-muted);
        font-weight: 500;
      }
      
      .elb-settings-input {
        padding: var(--elb-spacing-xs) var(--elb-spacing-sm);
        border: 1px solid var(--elb-border);
        border-radius: var(--elb-radius-sm);
        background: var(--elb-bg);
        color: var(--elb-fg);
        font-size: var(--elb-font-size-sm);
        font-family: var(--elb-font-mono);
      }
      
      .elb-settings-input--small {
        width: 100px;
      }
      
      .elb-settings-consent {
        display: flex;
        flex-wrap: wrap;
        gap: var(--elb-spacing-md);
      }
      
      .elb-settings-checkbox-wrapper {
        display: flex;
        align-items: center;
        gap: var(--elb-spacing-xs);
        cursor: pointer;
      }
      
      .elb-settings-checkbox {
        cursor: pointer;
      }
      
      .elb-settings-checkbox-label {
        font-size: var(--elb-font-size-sm);
        color: var(--elb-fg);
      }
      
      .elb-settings-condition {
        min-height: 80px;
        padding: var(--elb-spacing-sm);
        border: 1px solid var(--elb-border);
        border-radius: var(--elb-radius-sm);
        background: var(--elb-bg);
        color: var(--elb-fg);
        font-family: var(--elb-font-mono);
        font-size: var(--elb-font-size-sm);
        resize: vertical;
      }
      
      .elb-settings-help {
        font-size: var(--elb-font-size-xs);
        color: var(--elb-muted);
        font-style: italic;
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
