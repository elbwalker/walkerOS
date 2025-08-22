/**
 * Visual View for MappingBox
 * Interactive visual builder for mapping configuration
 */

import { createElement } from '../../../lib/dom';
import { MappingModel } from '../model';
import { createEntityActionSelector } from '../components/entityActionSelector';
import { createConfigurationManager } from '../components/configurationManager';
import { createValueMapper } from '../components/valueMapper';
import { createSettingsPanel } from '../components/settingsPanel';
import type { MappingSection } from '../types';

export interface VisualViewOptions {
  model: MappingModel;
  readOnly?: boolean;
  showConfigurationManager?: boolean;
}

export interface VisualViewAPI {
  refresh(): void;
  destroy(): void;
}

export function createVisualView(
  container: HTMLElement,
  options: VisualViewOptions,
): VisualViewAPI {
  const { model, readOnly, showConfigurationManager = true } = options;

  // Track sections and their expansion state
  const sections: MappingSection[] = [
    { id: 'values', type: 'values', label: 'Value Mappings', expanded: true },
    { id: 'settings', type: 'settings', label: 'Settings', expanded: false },
  ];

  // Component instances
  let configurationManager: ReturnType<
    typeof createConfigurationManager
  > | null = null;
  let entityActionSelector: ReturnType<
    typeof createEntityActionSelector
  > | null = null;
  let valueMapper: ReturnType<typeof createValueMapper> | null = null;
  let settingsPanel: ReturnType<typeof createSettingsPanel> | null = null;

  // Current selected entity/action
  let currentEntity = '';
  let currentAction = '';

  // Create sections
  function createSection(section: MappingSection): HTMLElement {
    const sectionEl = createElement('div', {
      class: `elb-mapping-section elb-mapping-section--${section.type}`,
      'data-expanded': section.expanded ? 'true' : 'false',
    });

    // Create header with collapse toggle
    const header = createElement('div', {
      class: 'elb-mapping-section-header',
    });

    const toggle = createElement('button', {
      class: 'elb-mapping-section-toggle',
      'aria-expanded': section.expanded ? 'true' : 'false',
    });
    toggle.innerHTML = section.expanded ? '▼' : '▶';
    toggle.onclick = () => toggleSection(section.id);

    const label = createElement('span', {
      class: 'elb-mapping-section-label',
    });
    label.textContent = section.label;

    header.appendChild(toggle);
    header.appendChild(label);
    sectionEl.appendChild(header);

    // Create content container
    const content = createElement('div', {
      class: 'elb-mapping-section-content',
      style: section.expanded ? '' : 'display: none;',
    });
    sectionEl.appendChild(content);

    return sectionEl;
  }

  // Toggle section expansion
  function toggleSection(sectionId: string): void {
    const section = sections.find((s) => s.id === sectionId);
    if (!section) return;

    section.expanded = !section.expanded;

    const sectionEl = container.querySelector(
      `.elb-mapping-section--${section.type}`,
    ) as HTMLElement;
    if (!sectionEl) return;

    const toggle = sectionEl.querySelector(
      '.elb-mapping-section-toggle',
    ) as HTMLElement;
    const content = sectionEl.querySelector(
      '.elb-mapping-section-content',
    ) as HTMLElement;

    toggle.innerHTML = section.expanded ? '▼' : '▶';
    toggle.setAttribute('aria-expanded', section.expanded ? 'true' : 'false');
    content.style.display = section.expanded ? '' : 'none';
    sectionEl.setAttribute(
      'data-expanded',
      section.expanded ? 'true' : 'false',
    );
  }

  // Render the visual view
  function render(): void {
    // Clear container
    container.innerHTML = '';

    // Add wrapper
    const wrapper = createElement('div', {
      class: 'elb-mapping-visual-wrapper',
    });
    container.appendChild(wrapper);

    // Create configuration manager (if enabled)
    if (showConfigurationManager && !readOnly) {
      const configSection = createElement('div', {
        class: 'elb-mapping-config-section',
      });
      wrapper.appendChild(configSection);

      configurationManager = createConfigurationManager(configSection, {
        model,
        readOnly,
        onConfigurationChange: (config) => {
          // Update current selection based on active configuration
          const entities = Object.keys(config.mapping);
          if (entities.length > 0) {
            const firstEntity = entities[0];
            const actions = Object.keys(config.mapping[firstEntity]);
            if (actions.length > 0) {
              currentEntity = firstEntity;
              currentAction = actions[0];
              if (entityActionSelector) {
                entityActionSelector.setSelection(currentEntity, currentAction);
              }
            }
          }
        },
      });
    }

    // Create entity/action selector section
    const selectorSection = createElement('div', {
      class: 'elb-mapping-selector-section',
    });
    wrapper.appendChild(selectorSection);

    entityActionSelector = createEntityActionSelector(selectorSection, {
      model,
      readOnly,
      onSelectionChange: (entity, action) => {
        currentEntity = entity;
        currentAction = action;

        // Update configuration manager if active configuration exists
        if (configurationManager) {
          const currentConfig = configurationManager.getCurrentConfiguration();
          if (currentConfig) {
            configurationManager.updateCurrentConfiguration(model.toJSON());
          }
        }

        // Refresh value mapper to show mappings for selected entity/action
        if (valueMapper) {
          valueMapper.refresh();
        }
      },
    });

    // Create collapsible sections
    sections.forEach((section) => {
      const sectionEl = createSection(section);
      wrapper.appendChild(sectionEl);

      const content = sectionEl.querySelector(
        '.elb-mapping-section-content',
      ) as HTMLElement;

      switch (section.type) {
        case 'values':
          valueMapper = createValueMapper(content, {
            model,
            readOnly,
          });
          break;

        case 'settings':
          settingsPanel = createSettingsPanel(content, {
            model,
            readOnly,
          });
          break;
      }
    });

    // Add styles
    addStyles();
  }

  // Add component styles
  function addStyles(): void {
    const styleId = 'elb-mapping-visual-styles';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .elb-mapping-visual-wrapper {
        padding: var(--elb-spacing-md);
        font-family: var(--elb-font-sans);
        color: var(--elb-fg);
        background: var(--elb-bg);
      }
      
      .elb-mapping-config-section {
        margin-bottom: var(--elb-spacing-md);
      }
      
      .elb-mapping-selector-section {
        margin-bottom: var(--elb-spacing-md);
      }
      
      .elb-mapping-section {
        margin-bottom: var(--elb-spacing-md);
        border: 1px solid var(--elb-border);
        border-radius: var(--elb-radius-md);
        background: var(--elb-surface);
        box-shadow: var(--elb-shadow-sm);
        transition: all var(--elb-transition-fast);
      }
      
      .elb-mapping-section:hover {
        border-color: var(--elb-accent);
        box-shadow: 0 0 0 1px rgba(37, 99, 235, 0.1);
      }
      
      .elb-mapping-section-header {
        display: flex;
        align-items: center;
        padding: var(--elb-spacing-md);
        border-bottom: 1px solid var(--elb-border);
        cursor: pointer;
        user-select: none;
        background: linear-gradient(135deg, var(--elb-hover), var(--elb-surface));
        transition: background-color var(--elb-transition-fast);
      }
      
      .elb-mapping-section-header:hover {
        background: var(--elb-hover);
      }
      
      .elb-mapping-section[data-expanded="false"] .elb-mapping-section-header {
        border-bottom: none;
        border-bottom-left-radius: var(--elb-radius-md);
        border-bottom-right-radius: var(--elb-radius-md);
      }
      
      .elb-mapping-section-toggle {
        background: none;
        border: none;
        color: var(--elb-muted);
        cursor: pointer;
        padding: 0;
        margin-right: var(--elb-spacing-sm);
        font-size: var(--elb-font-size-xs);
        width: 16px;
        text-align: center;
        transition: all var(--elb-transition-fast);
      }
      
      .elb-mapping-section-toggle:hover {
        color: var(--elb-accent);
        transform: scale(1.1);
      }
      
      .elb-mapping-section-label {
        font-weight: 600;
        font-size: var(--elb-font-size-md);
        color: var(--elb-fg);
      }
      
      .elb-mapping-section-content {
        padding: var(--elb-spacing-md);
        background: var(--elb-surface);
      }
      
      /* Responsive design */
      @media (max-width: 768px) {
        .elb-mapping-visual-wrapper {
          padding: var(--elb-spacing-sm);
        }
        
        .elb-mapping-section-header {
          padding: var(--elb-spacing-sm);
        }
        
        .elb-mapping-section-content {
          padding: var(--elb-spacing-sm);
        }
      }
    `;
    document.head.appendChild(style);
  }

  // Listen to model changes
  model.on('change', (data) => {
    // Update current configuration if exists
    if (configurationManager) {
      configurationManager.updateCurrentConfiguration(data);
    }

    // Refresh components
    if (entityActionSelector) entityActionSelector.refresh();
    if (valueMapper) valueMapper.refresh();
    if (settingsPanel) settingsPanel.refresh();
  });

  // Initial render
  render();

  // API
  return {
    refresh(): void {
      render();
    },

    destroy(): void {
      if (configurationManager) configurationManager.destroy();
      if (entityActionSelector) entityActionSelector.destroy();
      if (valueMapper) valueMapper.destroy();
      if (settingsPanel) settingsPanel.destroy();
      container.innerHTML = '';
    },
  };
}
