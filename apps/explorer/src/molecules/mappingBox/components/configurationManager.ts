/**
 * Configuration Manager Component
 * Handles switching between different mapping configurations
 */

import { createElement } from '../../../lib/dom';
import { getId } from '@walkeros/core';
import { MappingModel } from '../model';
import type { Mapping } from '@walkeros/core';

export interface ConfigurationManagerOptions {
  model: MappingModel;
  readOnly?: boolean;
  onConfigurationChange?: (config: MappingConfiguration) => void;
  onConfigurationDelete?: (configId: string) => void;
}

export interface MappingConfiguration {
  id: string;
  name: string;
  mapping: Mapping.Rules;
  createdAt: Date;
  updatedAt: Date;
  isActive?: boolean;
}

export interface ConfigurationManagerAPI {
  addConfiguration(name: string, mapping: Mapping.Rules): string;
  removeConfiguration(configId: string): void;
  switchToConfiguration(configId: string): void;
  getCurrentConfiguration(): MappingConfiguration | null;
  getAllConfigurations(): MappingConfiguration[];
  renameConfiguration(configId: string, newName: string): void;
  updateCurrentConfiguration(mapping: Mapping.Rules): void;
  refresh(): void;
  destroy(): void;
}

export function createConfigurationManager(
  container: HTMLElement,
  options: ConfigurationManagerOptions,
): ConfigurationManagerAPI {
  const {
    model,
    readOnly = false,
    onConfigurationChange,
    onConfigurationDelete,
  } = options;

  let configurations: Map<string, MappingConfiguration> = new Map();
  let activeConfigurationId: string | null = null;

  function render(): void {
    container.innerHTML = '';

    // Create wrapper
    const wrapper = createElement('div', {
      class: 'elb-configuration-manager',
    });

    // Create header
    const header = createElement('div', {
      class: 'elb-config-header',
    });

    const title = createElement('h3', {
      class: 'elb-config-title',
    });
    title.textContent = 'Mapping Configurations';

    const controls = createElement('div', {
      class: 'elb-config-controls',
    });

    if (!readOnly) {
      // Add new configuration button
      const addBtn = createElement('button', {
        class: 'elb-config-btn elb-config-btn--add',
        title: 'Add new configuration',
      });
      addBtn.innerHTML = '+ New';
      addBtn.onclick = () => showAddConfigurationDialog();
      controls.appendChild(addBtn);
    }

    header.appendChild(title);
    header.appendChild(controls);
    wrapper.appendChild(header);

    // Create configurations list
    if (configurations.size === 0) {
      const emptyState = createElement('div', {
        class: 'elb-config-empty',
      });
      emptyState.innerHTML = `
        <div class="elb-config-empty-icon">📋</div>
        <div class="elb-config-empty-text">No configurations yet</div>
        <div class="elb-config-empty-hint">Create your first mapping configuration to get started</div>
      `;
      wrapper.appendChild(emptyState);
    } else {
      const configsList = createElement('div', {
        class: 'elb-config-list',
      });

      configurations.forEach((config, id) => {
        const configItem = createConfigurationItem(config);
        configsList.appendChild(configItem);
      });

      wrapper.appendChild(configsList);
    }

    container.appendChild(wrapper);

    // Add styles
    addStyles();
  }

  function createConfigurationItem(config: MappingConfiguration): HTMLElement {
    const item = createElement('div', {
      class: `elb-config-item ${config.isActive ? 'elb-config-item--active' : ''}`,
      'data-config-id': config.id,
    });

    // Main content
    const content = createElement('div', {
      class: 'elb-config-content',
    });

    const nameEl = createElement('div', {
      class: 'elb-config-name',
    });
    nameEl.textContent = config.name;

    const meta = createElement('div', {
      class: 'elb-config-meta',
    });

    const entityCount = Object.keys(config.mapping).length;
    const actionCount = Object.values(config.mapping).reduce(
      (count, entityData) => count + Object.keys(entityData).length,
      0,
    );

    meta.innerHTML = `
      <span class="elb-config-stats">${entityCount} entities, ${actionCount} actions</span>
      <span class="elb-config-updated">Updated ${formatDate(config.updatedAt)}</span>
    `;

    content.appendChild(nameEl);
    content.appendChild(meta);

    // Actions
    const actions = createElement('div', {
      class: 'elb-config-actions',
    });

    // Switch button
    if (!config.isActive) {
      const switchBtn = createElement('button', {
        class: 'elb-config-action-btn elb-config-action-btn--switch',
        title: 'Switch to this configuration',
      });
      switchBtn.innerHTML = '↻';
      switchBtn.onclick = () => switchToConfiguration(config.id);
      actions.appendChild(switchBtn);
    } else {
      const activeIndicator = createElement('span', {
        class: 'elb-config-active-indicator',
      });
      activeIndicator.textContent = '✓ Active';
      actions.appendChild(activeIndicator);
    }

    if (!readOnly) {
      // Rename button
      const renameBtn = createElement('button', {
        class: 'elb-config-action-btn elb-config-action-btn--rename',
        title: 'Rename configuration',
      });
      renameBtn.innerHTML = '✏️';
      renameBtn.onclick = (e) => {
        e.stopPropagation();
        showRenameDialog(config);
      };
      actions.appendChild(renameBtn);

      // Delete button
      if (!config.isActive || configurations.size > 1) {
        const deleteBtn = createElement('button', {
          class: 'elb-config-action-btn elb-config-action-btn--delete',
          title: 'Delete configuration',
        });
        deleteBtn.innerHTML = '🗑️';
        deleteBtn.onclick = (e) => {
          e.stopPropagation();
          if (confirm(`Delete configuration "${config.name}"?`)) {
            removeConfiguration(config.id);
          }
        };
        actions.appendChild(deleteBtn);
      }
    }

    item.appendChild(content);
    item.appendChild(actions);

    return item;
  }

  function showAddConfigurationDialog(): void {
    const name = prompt('Configuration name:');
    if (name && name.trim()) {
      const currentMapping = model.toJSON();
      addConfiguration(name.trim(), currentMapping);
    }
  }

  function showRenameDialog(config: MappingConfiguration): void {
    const newName = prompt('New name:', config.name);
    if (newName && newName.trim() && newName.trim() !== config.name) {
      renameConfiguration(config.id, newName.trim());
    }
  }

  function formatDate(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    if (diff < 60000) return 'just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  }

  function addStyles(): void {
    const styleId = 'elb-configuration-manager-styles';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .elb-configuration-manager {
        background: var(--elb-surface);
        border-radius: var(--elb-radius-md);
        border: 1px solid var(--elb-border);
        overflow: hidden;
      }
      
      .elb-config-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: var(--elb-spacing-md);
        background: var(--elb-hover);
        border-bottom: 1px solid var(--elb-border);
      }
      
      .elb-config-title {
        margin: 0;
        font-size: var(--elb-font-size-md);
        font-weight: 600;
        color: var(--elb-fg);
      }
      
      .elb-config-controls {
        display: flex;
        gap: var(--elb-spacing-xs);
      }
      
      .elb-config-btn {
        padding: var(--elb-spacing-xs) var(--elb-spacing-sm);
        font-size: var(--elb-font-size-sm);
        font-weight: 500;
        border-radius: var(--elb-radius-sm);
        border: 1px solid var(--elb-border);
        background: var(--elb-surface);
        color: var(--elb-fg);
        cursor: pointer;
        transition: all var(--elb-transition-fast);
      }
      
      .elb-config-btn:hover {
        background: var(--elb-hover);
      }
      
      .elb-config-btn--add {
        background: var(--elb-accent);
        color: white;
        border-color: var(--elb-accent);
      }
      
      .elb-config-btn--add:hover {
        filter: brightness(1.1);
      }
      
      .elb-config-empty {
        text-align: center;
        padding: var(--elb-spacing-xl);
        color: var(--elb-muted);
      }
      
      .elb-config-empty-icon {
        font-size: 2rem;
        margin-bottom: var(--elb-spacing-sm);
      }
      
      .elb-config-empty-text {
        font-size: var(--elb-font-size-md);
        font-weight: 500;
        margin-bottom: var(--elb-spacing-xs);
      }
      
      .elb-config-empty-hint {
        font-size: var(--elb-font-size-sm);
        opacity: 0.8;
      }
      
      .elb-config-list {
        max-height: 300px;
        overflow-y: auto;
      }
      
      .elb-config-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: var(--elb-spacing-md);
        border-bottom: 1px solid var(--elb-border);
        transition: all var(--elb-transition-fast);
        cursor: pointer;
      }
      
      .elb-config-item:last-child {
        border-bottom: none;
      }
      
      .elb-config-item:hover {
        background: var(--elb-hover);
      }
      
      .elb-config-item--active {
        background: rgba(37, 99, 235, 0.05);
        border-left: 3px solid var(--elb-accent);
      }
      
      .elb-config-content {
        flex: 1;
      }
      
      .elb-config-name {
        font-size: var(--elb-font-size-md);
        font-weight: 500;
        color: var(--elb-fg);
        margin-bottom: var(--elb-spacing-xs);
      }
      
      .elb-config-meta {
        display: flex;
        gap: var(--elb-spacing-md);
        font-size: var(--elb-font-size-sm);
        color: var(--elb-muted);
      }
      
      .elb-config-stats {
        font-family: var(--elb-font-mono);
      }
      
      .elb-config-actions {
        display: flex;
        gap: var(--elb-spacing-xs);
        align-items: center;
      }
      
      .elb-config-active-indicator {
        font-size: var(--elb-font-size-sm);
        color: var(--elb-accent);
        font-weight: 500;
      }
      
      .elb-config-action-btn {
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 1px solid var(--elb-border);
        border-radius: var(--elb-radius-sm);
        background: var(--elb-surface);
        color: var(--elb-muted);
        cursor: pointer;
        transition: all var(--elb-transition-fast);
        font-size: var(--elb-font-size-sm);
      }
      
      .elb-config-action-btn:hover {
        background: var(--elb-hover);
        color: var(--elb-fg);
      }
      
      .elb-config-action-btn--switch {
        color: var(--elb-accent);
      }
      
      .elb-config-action-btn--switch:hover {
        background: rgba(37, 99, 235, 0.1);
      }
      
      .elb-config-action-btn--delete {
        color: var(--elb-error);
      }
      
      .elb-config-action-btn--delete:hover {
        background: rgba(220, 38, 38, 0.1);
        border-color: var(--elb-error);
      }
      
      .elb-config-list::-webkit-scrollbar {
        width: 4px;
      }
      
      .elb-config-list::-webkit-scrollbar-track {
        background: var(--elb-hover);
      }
      
      .elb-config-list::-webkit-scrollbar-thumb {
        background: var(--elb-border);
        border-radius: 2px;
      }
    `;
    document.head.appendChild(style);
  }

  // Initial render
  render();

  return {
    addConfiguration(name: string, mapping: Mapping.Rules): string {
      const id = getId(12);
      const config: MappingConfiguration = {
        id,
        name,
        mapping: { ...mapping },
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: false,
      };

      configurations.set(id, config);
      render();
      return id;
    },

    removeConfiguration(configId: string): void {
      const config = configurations.get(configId);
      if (!config) return;

      configurations.delete(configId);

      if (config.isActive) {
        // Switch to first available configuration or create empty one
        const firstConfig = configurations.values().next().value;
        if (firstConfig) {
          switchToConfiguration(firstConfig.id);
        } else {
          activeConfigurationId = null;
          model.fromJSON({});
        }
      }

      render();

      if (onConfigurationDelete) {
        onConfigurationDelete(configId);
      }
    },

    switchToConfiguration(configId: string): void {
      const config = configurations.get(configId);
      if (!config) return;

      // Deactivate current configuration
      if (activeConfigurationId) {
        const currentConfig = configurations.get(activeConfigurationId);
        if (currentConfig) {
          currentConfig.isActive = false;
        }
      }

      // Activate new configuration
      config.isActive = true;
      activeConfigurationId = configId;

      // Update model
      model.fromJSON(config.mapping);

      render();

      if (onConfigurationChange) {
        onConfigurationChange(config);
      }
    },

    getCurrentConfiguration(): MappingConfiguration | null {
      return activeConfigurationId
        ? configurations.get(activeConfigurationId) || null
        : null;
    },

    getAllConfigurations(): MappingConfiguration[] {
      return Array.from(configurations.values());
    },

    renameConfiguration(configId: string, newName: string): void {
      const config = configurations.get(configId);
      if (!config) return;

      config.name = newName;
      config.updatedAt = new Date();
      render();
    },

    updateCurrentConfiguration(mapping: Mapping.Rules): void {
      if (!activeConfigurationId) return;

      const config = configurations.get(activeConfigurationId);
      if (!config) return;

      config.mapping = { ...mapping };
      config.updatedAt = new Date();
    },

    refresh(): void {
      render();
    },

    destroy(): void {
      container.innerHTML = '';
    },
  };
}
