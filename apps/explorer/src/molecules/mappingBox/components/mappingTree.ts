/**
 * Mapping Tree Component
 * Tree-based interface for complex nested value mappings
 */

import { createElement } from '../../../lib/dom';
import { MappingModel } from '../model';
import { getId } from '@walkeros/core';
import type { MappingNode, MappingTreeOptions } from '../types';

export interface MappingTreeAPI {
  refresh(): void;
  destroy(): void;
  addNode(parentId?: string): void;
  removeNode(nodeId: string): void;
  expandNode(nodeId: string, expanded: boolean): void;
}

export function createMappingTree(
  container: HTMLElement,
  options: MappingTreeOptions,
): MappingTreeAPI {
  const { model, readOnly = false, maxDepth = 10 } = options;

  let treeData: MappingNode[] = [];

  function generateId(): string {
    return getId(9); // Use walkerOS core getId function
  }

  function convertMappingToTree(
    mappings: any,
    parentId?: string,
    depth = 0,
  ): MappingNode[] {
    if (!mappings || typeof mappings !== 'object') return [];

    const nodes: MappingNode[] = [];

    Object.entries(mappings).forEach(([key, value]) => {
      const nodeId = generateId();
      const config = parseValueConfig(value);

      const node: MappingNode = {
        id: nodeId,
        key,
        config,
        children: [],
        depth,
        expanded: depth < 2, // Auto-expand first 2 levels
        isValid: true,
      };

      // Handle nested structures for map
      if (config.map && typeof config.map === 'object') {
        node.children = convertMappingToTree(config.map, nodeId, depth + 1);
      }

      nodes.push(node);
    });

    return nodes;
  }

  function parseValueConfig(value: any): MappingNode['config'] {
    const config: MappingNode['config'] = {};

    if (typeof value === 'string') {
      // Simple key mapping
      config.key = value;
    } else if (typeof value === 'object' && value !== null) {
      // Copy all properties from ValueConfig
      if ('key' in value) config.key = value.key;
      if ('value' in value) config.value = value.value;
      if ('fn' in value) config.fn = value.fn;
      if ('condition' in value) config.condition = value.condition;
      if ('consent' in value) config.consent = value.consent;
      if ('validate' in value) config.validate = value.validate;
      if ('map' in value) config.map = value.map;
      if ('loop' in value) config.loop = value.loop;
      if ('set' in value) config.set = value.set;
    }

    return config;
  }

  function detectMappingType(value: any): MappingNode['type'] {
    if (typeof value === 'string') return 'key';
    if (typeof value === 'object' && value !== null) {
      if ('value' in value) return 'static';
      if ('fn' in value) return 'function';
      if ('map' in value) return 'map';
      if ('loop' in value) return 'loop';
      if ('set' in value) return 'set';
      if ('condition' in value) return 'condition';
    }
    return 'static';
  }

  function render(): void {
    container.innerHTML = '';

    const wrapper = createElement('div', {
      class: 'elb-mapping-tree',
    });

    // Get current mappings from model
    const mappings = model.getValueMappings();
    if (mappings.length === 0) {
      renderEmptyState(wrapper);
    } else {
      // Convert flat mappings to tree structure
      const treeStructure: Record<string, any> = {};
      mappings.forEach((mapping) => {
        treeStructure[mapping.key] = mapping.value;
      });

      treeData = convertMappingToTree(treeStructure);
      renderTree(wrapper, treeData);
    }

    container.appendChild(wrapper);
  }

  function renderEmptyState(container: HTMLElement): void {
    const empty = createElement('div', {
      class: 'elb-mapping-tree-empty',
    });
    empty.innerHTML = `
      <div class="elb-mapping-tree-empty-icon">🗂️</div>
      <div class="elb-mapping-tree-empty-text">No value mappings configured</div>
      <div class="elb-mapping-tree-empty-hint">Add mappings to transform event data</div>
    `;
    container.appendChild(empty);
  }

  function renderTree(
    container: HTMLElement,
    nodes: MappingNode[],
    parentDepth = -1,
  ): void {
    nodes.forEach((node) => {
      const nodeEl = createNodeElement(node);
      container.appendChild(nodeEl);

      if (node.children.length > 0 && node.expanded) {
        const childrenContainer = createElement('div', {
          class: 'elb-mapping-tree-children',
          style: `margin-left: ${(node.depth + 1) * 20}px`,
        });
        renderTree(childrenContainer, node.children, node.depth);
        container.appendChild(childrenContainer);
      }
    });
  }

  function createNodeElement(node: MappingNode): HTMLElement {
    const nodeEl = createElement('div', {
      class: 'elb-mapping-tree-node',
      'data-depth': node.depth.toString(),
      'data-expanded': node.expanded ? 'true' : 'false',
    });

    // Indent based on depth
    nodeEl.style.paddingLeft = `${node.depth * 20 + 12}px`;

    // Expand/collapse button for nodes with children
    if (node.children.length > 0) {
      const expandBtn = createElement('button', {
        class: 'elb-mapping-tree-expand',
      });
      expandBtn.innerHTML = node.expanded ? '▼' : '▶';
      expandBtn.onclick = () => expandNode(node.id, !node.expanded);
      nodeEl.appendChild(expandBtn);
    } else {
      // Spacer for alignment
      const spacer = createElement('span', {
        class: 'elb-mapping-tree-spacer',
      });
      nodeEl.appendChild(spacer);
    }

    // Property name input
    const keyInput = createElement('input', {
      type: 'text',
      class: 'elb-mapping-tree-key',
      value: node.key || '',
      placeholder: 'property_name',
      disabled: readOnly ? 'true' : undefined,
    }) as HTMLInputElement;

    keyInput.addEventListener('change', () => {
      updateNodeKey(node.id, keyInput.value);
    });

    nodeEl.appendChild(keyInput);

    // Property configuration section
    const configSection = createElement('div', {
      class: 'elb-mapping-tree-config',
    });

    // Create property toggles and editors
    configSection.appendChild(createPropertyToggles(node));

    nodeEl.appendChild(configSection);

    // Action buttons
    if (!readOnly) {
      const actions = createElement('div', {
        class: 'elb-mapping-tree-actions',
      });

      // Add child button for map type
      if (node.config.map && node.depth < maxDepth) {
        const addChildBtn = createElement('button', {
          class: 'elb-mapping-tree-add-child',
          title: 'Add nested property',
        });
        addChildBtn.innerHTML = '+';
        addChildBtn.onclick = () => addNode(node.id);
        actions.appendChild(addChildBtn);
      }

      // Remove button
      const removeBtn = createElement('button', {
        class: 'elb-mapping-tree-remove',
        title: 'Remove property',
      });
      removeBtn.innerHTML = '×';
      removeBtn.onclick = () => removeNode(node.id);
      actions.appendChild(removeBtn);

      nodeEl.appendChild(actions);
    }

    return nodeEl;
  }

  function createPropertyToggles(node: MappingNode): HTMLElement {
    const container = createElement('div', {
      class: 'elb-mapping-tree-properties',
    });

    // Key mapping toggle
    container.appendChild(
      createPropertyToggle(node, 'key', 'Key Path', () =>
        createElement('input', {
          type: 'text',
          value: node.config.key || '',
          placeholder: 'data.property',
          disabled: readOnly ? 'true' : undefined,
          oninput: (e: any) => updateNodeConfig(node.id, 'key', e.target.value),
        }),
      ),
    );

    // Static value toggle
    container.appendChild(
      createPropertyToggle(node, 'value', 'Static Value', () =>
        createElement('input', {
          type: 'text',
          value:
            node.config.value !== undefined
              ? JSON.stringify(node.config.value)
              : '',
          placeholder: '"static value"',
          disabled: readOnly ? 'true' : undefined,
          oninput: (e: any) => {
            try {
              const parsed = JSON.parse(e.target.value);
              updateNodeConfig(node.id, 'value', parsed);
            } catch {
              updateNodeConfig(node.id, 'value', e.target.value);
            }
          },
        }),
      ),
    );

    // Function toggle
    container.appendChild(
      createPropertyToggle(node, 'fn', 'Function', () => {
        const textarea = createElement('textarea', {
          class: 'elb-mapping-tree-function',
          placeholder: '(event, mapping, options) => event.data.value',
          disabled: readOnly ? 'true' : undefined,
        }) as HTMLTextAreaElement;

        if (node.config.fn) {
          textarea.value =
            typeof node.config.fn === 'function'
              ? node.config.fn.toString()
              : node.config.fn;
        }

        textarea.addEventListener('change', () => {
          updateNodeConfig(node.id, 'fn', textarea.value);
        });

        return textarea;
      }),
    );

    // Condition toggle
    container.appendChild(
      createPropertyToggle(node, 'condition', 'Condition', () => {
        const textarea = createElement('textarea', {
          class: 'elb-mapping-tree-condition',
          placeholder: '(event) => event.data.isValid',
          disabled: readOnly ? 'true' : undefined,
        }) as HTMLTextAreaElement;

        if (node.config.condition) {
          textarea.value =
            typeof node.config.condition === 'function'
              ? node.config.condition.toString()
              : node.config.condition;
        }

        textarea.addEventListener('change', () => {
          updateNodeConfig(node.id, 'condition', textarea.value);
        });

        return textarea;
      }),
    );

    // Object map toggle
    container.appendChild(
      createPropertyToggle(node, 'map', 'Object Map', () => {
        const badge = createElement('div', {
          class: 'elb-mapping-tree-complex-badge',
        });
        badge.innerHTML = `{} Nested Object <span class="count">${Object.keys(node.config.map || {}).length} properties</span>`;
        return badge;
      }),
    );

    return container;
  }

  function createPropertyToggle(
    node: MappingNode,
    property: keyof MappingNode['config'],
    label: string,
    createEditor: () => HTMLElement,
  ): HTMLElement {
    const isActive = node.config[property] !== undefined;

    const toggle = createElement('div', {
      class: `elb-mapping-tree-property ${isActive ? 'active' : ''}`,
      'data-property': property,
    });

    // Toggle checkbox and label
    const header = createElement('div', {
      class: 'elb-mapping-tree-property-header',
    });

    const checkbox = createElement('input', {
      type: 'checkbox',
      checked: isActive ? 'true' : undefined,
      disabled: readOnly ? 'true' : undefined,
    }) as HTMLInputElement;

    checkbox.addEventListener('change', () => {
      if (checkbox.checked) {
        // Enable property with default value
        const defaultValue = getDefaultValue(property);
        updateNodeConfig(node.id, property, defaultValue);
      } else {
        // Disable property
        updateNodeConfig(node.id, property, undefined);
      }
    });

    const labelEl = createElement('label');
    labelEl.textContent = label;
    labelEl.prepend(checkbox);

    header.appendChild(labelEl);
    toggle.appendChild(header);

    // Editor (only shown when active)
    if (isActive) {
      const editor = createElement('div', {
        class: 'elb-mapping-tree-property-editor',
      });
      editor.appendChild(createEditor());
      toggle.appendChild(editor);
    }

    return toggle;
  }

  function getDefaultValue(property: keyof MappingNode['config']): any {
    switch (property) {
      case 'key':
        return 'data.value';
      case 'value':
        return '';
      case 'fn':
        return '(event) => event.data.value';
      case 'condition':
        return '(event) => true';
      case 'map':
        return {};
      case 'loop':
        return ['nested', { map: {} }];
      case 'set':
        return [];
      default:
        return undefined;
    }
  }

  function updateNodeConfig(
    nodeId: string,
    property: keyof MappingNode['config'],
    value: any,
  ): void {
    const node = findNodeById(nodeId);
    if (!node) return;

    if (value === undefined) {
      // Remove property
      delete node.config[property];
    } else {
      // Set property
      node.config[property] = value;
    }

    // Update the model
    if (node.key) {
      const modelValue = buildModelValue(node.config);
      model.setValueMapping(node.key, modelValue);
    }

    render(); // Re-render to show updated toggles
  }

  function buildModelValue(config: MappingNode['config']): any {
    // Build the actual ValueConfig for the model
    const result: any = {};

    if (config.key !== undefined) {
      if (Object.keys(config).length === 1) {
        // Simple key mapping
        return config.key;
      }
      result.key = config.key;
    }

    if (config.value !== undefined) result.value = config.value;
    if (config.fn !== undefined) result.fn = config.fn;
    if (config.condition !== undefined) result.condition = config.condition;
    if (config.consent !== undefined) result.consent = config.consent;
    if (config.validate !== undefined) result.validate = config.validate;
    if (config.map !== undefined) result.map = config.map;
    if (config.loop !== undefined) result.loop = config.loop;
    if (config.set !== undefined) result.set = config.set;

    return Object.keys(result).length === 0 ? undefined : result;
  }

  function updateNodeKey(nodeId: string, newKey: string): void {
    // Find and update the node
    const node = findNodeById(nodeId);
    if (node) {
      const oldKey = node.key;
      node.key = newKey;

      // Update in model
      if (oldKey && oldKey !== newKey) {
        model.removeValueMapping(oldKey);
      }
      if (newKey) {
        model.setValueMapping(newKey, node.value);
      }
    }
  }

  function addNode(parentId?: string): void {
    const newNode: MappingNode = {
      id: generateId(),
      key: `property_${Date.now()}`,
      config: {
        key: 'data.value', // Default to simple key mapping
      },
      children: [],
      depth: parentId ? (findNodeById(parentId)?.depth || 0) + 1 : 0,
      expanded: false,
      isValid: true,
    };

    if (parentId) {
      const parent = findNodeById(parentId);
      if (parent && parent.config.map) {
        // Add to parent's map
        parent.config.map[newNode.key] = newNode.config.key;
        parent.children.push(newNode);
        parent.expanded = true; // Auto-expand parent
      }
    } else {
      treeData.push(newNode);
    }

    // Add to model
    const modelValue = buildModelValue(newNode.config);
    model.setValueMapping(newNode.key, modelValue);
    render();
  }

  function removeNode(nodeId: string): void {
    const node = findNodeById(nodeId);
    if (!node) return;

    // Remove from model
    if (node.key) {
      model.removeValueMapping(node.key);
    }

    // Remove from tree structure
    removeNodeFromTree(nodeId, treeData);
    render();
  }

  function removeNodeFromTree(nodeId: string, nodes: MappingNode[]): boolean {
    for (let i = 0; i < nodes.length; i++) {
      if (nodes[i].id === nodeId) {
        nodes.splice(i, 1);
        return true;
      }
      if (removeNodeFromTree(nodeId, nodes[i].children)) {
        return true;
      }
    }
    return false;
  }

  function expandNode(nodeId: string, expanded: boolean): void {
    const node = findNodeById(nodeId);
    if (node) {
      node.expanded = expanded;
      render();
    }
  }

  function findNodeById(
    nodeId: string,
    nodes: MappingNode[] = treeData,
  ): MappingNode | null {
    for (const node of nodes) {
      if (node.id === nodeId) return node;
      const found = findNodeById(nodeId, node.children);
      if (found) return found;
    }
    return null;
  }

  function editFunction(nodeId: string): void {
    // TODO: Open function editor modal
    console.log('Edit function for node:', nodeId);
  }

  function addStyles(): void {
    const styleId = 'elb-mapping-tree-styles';
    if (document.getElementById(styleId)) return;

    console.log('[MappingTree] Adding styles...');
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      /* Use Explorer theme CSS variables - no need to redefine them */
      
      .elb-mapping-tree {
        background: var(--elb-surface);
        border-radius: var(--elb-radius-md);
        border: 1px solid var(--elb-border);
        box-shadow: var(--elb-shadow-sm);
        overflow: hidden;
        font-family: var(--elb-font-sans);
      }
      
      .elb-mapping-tree-empty {
        text-align: center;
        padding: var(--elb-spacing-xl) * 2;
        color: var(--elb-muted);
        background: var(--elb-hover);
      }
      
      .elb-mapping-tree-empty-icon {
        font-size: 3rem;
        margin-bottom: var(--elb-spacing-md);
        opacity: 0.6;
      }
      
      .elb-mapping-tree-empty-text {
        font-size: var(--elb-font-size-lg);
        font-weight: 600;
        margin-bottom: var(--elb-spacing-sm);
        color: var(--elb-fg);
      }
      
      .elb-mapping-tree-empty-hint {
        font-size: var(--elb-font-size-md);
        opacity: 0.8;
        line-height: 1.5;
      }
      
      .elb-mapping-tree-node {
        display: flex;
        align-items: center;
        gap: var(--elb-spacing-sm);
        padding: var(--elb-spacing-xs) var(--elb-spacing-sm);
        border-bottom: 1px solid var(--elb-border);
        background: var(--elb-surface);
        transition: background-color var(--elb-transition-fast);
      }
      
      .elb-mapping-tree-node:hover {
        background: var(--elb-hover);
      }
      
      .elb-mapping-tree-expand {
        background: none;
        border: none;
        color: var(--elb-muted);
        cursor: pointer;
        padding: 0;
        width: 16px;
        font-size: var(--elb-font-size-xs);
        text-align: center;
      }
      
      .elb-mapping-tree-spacer {
        width: 16px;
      }
      
      .elb-mapping-tree-key {
        padding: var(--elb-spacing-xs) var(--elb-spacing-sm);
        border: 1px solid var(--elb-border);
        border-radius: var(--elb-radius-sm);
        background: var(--elb-bg);
        color: var(--elb-fg);
        font-size: var(--elb-font-size-sm);
        font-family: var(--elb-font-mono);
        min-width: 150px;
        margin-right: var(--elb-spacing-sm);
      }
      
      .elb-mapping-tree-config {
        flex: 1;
        margin-left: var(--elb-spacing-sm);
      }
      
      .elb-mapping-tree-properties {
        display: flex;
        flex-direction: column;
        gap: var(--elb-spacing-xs);
      }
      
      .elb-mapping-tree-property {
        border: 1px solid var(--elb-border);
        border-radius: var(--elb-radius-sm);
        background: var(--elb-surface);
        padding: var(--elb-spacing-xs);
      }
      
      .elb-mapping-tree-property.active {
        border-color: var(--elb-accent);
        background: var(--elb-accent-light);
      }
      
      .elb-mapping-tree-property-header {
        display: flex;
        align-items: center;
        gap: var(--elb-spacing-xs);
      }
      
      .elb-mapping-tree-property-header label {
        display: flex;
        align-items: center;
        gap: var(--elb-spacing-xs);
        font-size: var(--elb-font-size-sm);
        font-weight: 500;
        color: var(--elb-fg);
        cursor: pointer;
      }
      
      .elb-mapping-tree-property-editor {
        margin-top: var(--elb-spacing-xs);
        padding-left: var(--elb-spacing-md);
      }
      
      .elb-mapping-tree-property-editor input,
      .elb-mapping-tree-property-editor textarea {
        width: 100%;
        padding: var(--elb-spacing-xs) var(--elb-spacing-sm);
        border: 1px solid var(--elb-border);
        border-radius: var(--elb-radius-sm);
        background: var(--elb-bg);
        color: var(--elb-fg);
        font-size: var(--elb-font-size-sm);
        font-family: var(--elb-font-mono);
      }
      
      .elb-mapping-tree-function,
      .elb-mapping-tree-condition {
        min-height: 60px;
        resize: vertical;
      }
      
      .elb-mapping-tree-complex-badge {
        padding: var(--elb-spacing-xs) var(--elb-spacing-sm);
        background: var(--elb-hover);
        border-radius: var(--elb-radius-sm);
        font-size: var(--elb-font-size-sm);
        color: var(--elb-fg);
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      
      .elb-mapping-tree-complex-badge .count {
        background: var(--elb-accent);
        color: white;
        padding: 2px 6px;
        border-radius: var(--elb-radius-sm);
        font-size: var(--elb-font-size-xs);
      }
      
      
      .elb-mapping-tree-property input[type="checkbox"] {
        margin-right: var(--elb-spacing-xs);
        cursor: pointer;
      }
      
      .elb-mapping-tree-actions {
        display: flex;
        gap: var(--elb-spacing-xs);
      }
      
      .elb-mapping-tree-add-child,
      .elb-mapping-tree-remove {
        background: none;
        border: 1px solid var(--elb-border);
        border-radius: var(--elb-radius-sm);
        color: var(--elb-muted);
        cursor: pointer;
        padding: var(--elb-spacing-xs);
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: var(--elb-font-size-sm);
        line-height: 1;
      }
      
      .elb-mapping-tree-add-child:hover {
        background: var(--elb-hover);
        color: var(--elb-accent);
      }
      
      .elb-mapping-tree-remove:hover {
        background: var(--elb-error-bg);
        color: var(--elb-error);
        border-color: var(--elb-error);
      }
      
      .elb-mapping-tree-children {
        border-left: 2px solid var(--elb-border);
      }
      
    `;
    document.head.appendChild(style);
  }

  // Add styles first before rendering
  addStyles();

  // Initial render
  render();

  // Listen to model changes
  model.on('change', () => {
    render();
  });

  return {
    refresh(): void {
      render();
    },

    destroy(): void {
      container.innerHTML = '';
    },

    addNode(parentId?: string, type?: MappingNode['type']): void {
      addNode(parentId, type);
    },

    removeNode(nodeId: string): void {
      removeNode(nodeId);
    },

    expandNode(nodeId: string, expanded: boolean): void {
      expandNode(nodeId, expanded);
    },
  };
}
