/**
 * Value Mapper Component
 * Advanced tree-based interface for complex nested value mappings
 */

import { createElement } from '../../../lib/dom';
import { createMappingTree } from './mappingTree';
import { MappingModel } from '../model';
import type { ValueMappingConfig, MappingTreeOptions } from '../types';

export interface ValueMapperOptions {
  model: MappingModel;
  readOnly?: boolean;
}

export interface ValueMapperAPI {
  refresh(): void;
  destroy(): void;
  addMapping(): void;
}

export function createValueMapper(
  container: HTMLElement,
  options: ValueMapperOptions,
): ValueMapperAPI {
  const { model, readOnly } = options;

  let mappingTree: ReturnType<typeof createMappingTree> | null = null;

  function render(): void {
    container.innerHTML = '';

    const wrapper = createElement('div', {
      class: 'elb-value-mapper-wrapper',
    });

    // Create header
    const header = createHeader();
    wrapper.appendChild(header);

    // Create main content area
    const content = createElement('div', {
      class: 'elb-value-mapper-content',
    });

    renderTreeView(content);
    wrapper.appendChild(content);
    container.appendChild(wrapper);
  }

  function createHeader(): HTMLElement {
    const header = createElement('div', {
      class: 'elb-value-mapper-header',
    });

    const title = createElement('h3', {
      class: 'elb-value-mapper-title',
    });
    title.textContent = 'Value Mappings';
    header.appendChild(title);

    if (!readOnly) {
      const controls = createElement('div', {
        class: 'elb-value-mapper-controls',
      });

      // Add mapping button
      const addBtn = createElement('button', {
        class: 'elb-value-mapper-add-btn',
      });
      addBtn.innerHTML = '+ Add Property Mapping';
      addBtn.onclick = () => addMapping();
      controls.appendChild(addBtn);

      header.appendChild(controls);
    }

    return header;
  }

  function renderTreeView(container: HTMLElement): void {
    const treeContainer = createElement('div', {
      class: 'elb-value-mapper-tree-container',
    });

    const treeOptions: MappingTreeOptions = {
      model,
      readOnly,
      maxDepth: 10,
      onChange: (tree) => {
        // Handle tree changes
        console.log('Tree changed:', tree);
      },
    };

    mappingTree = createMappingTree(treeContainer, treeOptions);
    container.appendChild(treeContainer);
  }

  function addMapping(): void {
    if (mappingTree) {
      mappingTree.addNode();
    } else {
      // Fallback: add directly to model
      const key = `property_${Date.now()}`;
      model.setValueMapping(key, 'data.value');
    }
  }

  function addStyles(): void {
    const styleId = 'elb-value-mapper-styles';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      /* CSS Variables for Explorer theme */
      :root {
        --elb-bg: #fafafa;
        --elb-fg: #0a0a0a;
        --elb-border: #e4e4e7;
        --elb-accent: #2563eb;
        --elb-accent-hover: #1d4ed8;
        --elb-error: #dc2626;
        --elb-success: #16a34a;
        --elb-warning: #d97706;
        --elb-muted: #71717a;
        --elb-surface: #ffffff;
        --elb-hover: #f4f4f5;
        
        --elb-font-mono: 'Cascadia Code', 'Source Code Pro', monospace;
        --elb-font-sans: system-ui, -apple-system, sans-serif;
        
        --elb-font-size-xs: 0.6875rem;
        --elb-font-size-sm: 0.75rem;
        --elb-font-size-md: 0.875rem;
        --elb-font-size-lg: 1rem;
        
        --elb-spacing-xs: 0.125rem;
        --elb-spacing-sm: 0.25rem;
        --elb-spacing-md: 0.5rem;
        --elb-spacing-lg: 0.75rem;
        --elb-spacing-xl: 1rem;
        
        --elb-radius-sm: 0.375rem;
        --elb-radius-md: 0.5rem;
        --elb-radius-lg: 0.75rem;
        
        --elb-transition-fast: 150ms ease-in-out;
        --elb-transition-base: 250ms ease-in-out;
      }
      
      .elb-value-mapper-wrapper {
        display: flex;
        flex-direction: column;
        height: 100%;
        background: var(--elb-surface);
        border-radius: var(--elb-radius-md);
        overflow: hidden;
      }
      
      .elb-value-mapper-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: var(--elb-spacing-md);
        border-bottom: 1px solid var(--elb-border);
        background: var(--elb-bg);
      }
      
      .elb-value-mapper-title {
        margin: 0;
        font-size: var(--elb-font-size-md);
        font-weight: 600;
        color: var(--elb-fg);
      }
      
      .elb-value-mapper-controls {
        display: flex;
        align-items: center;
      }
      
      .elb-value-mapper-add-btn {
        background: var(--elb-accent);
        color: white;
        border: none;
        padding: var(--elb-spacing-xs) var(--elb-spacing-md);
        border-radius: var(--elb-radius-sm);
        font-size: var(--elb-font-size-sm);
        cursor: pointer;
        transition: all var(--elb-transition-fast);
      }
      
      .elb-value-mapper-add-btn:hover {
        background: var(--elb-accent-hover);
      }
      
      .elb-value-mapper-content {
        flex: 1;
        overflow: auto;
      }
      
      .elb-value-mapper-tree-container {
        height: 100%;
      }
    `;
    document.head.appendChild(style);
  }

  // Add styles first before rendering
  addStyles();

  // Listen to model changes
  model.on('change', () => {
    if (mappingTree) {
      mappingTree.refresh();
    }
  });

  // Initial render
  render();

  // API
  return {
    refresh(): void {
      if (mappingTree) {
        mappingTree.refresh();
      } else {
        render();
      }
    },

    destroy(): void {
      if (mappingTree) {
        mappingTree.destroy();
        mappingTree = null;
      }
      container.innerHTML = '';
    },

    addMapping(): void {
      addMapping();
    },
  };
}
