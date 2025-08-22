/**
 * MappingBox Molecule Component
 * Dual-mode mapping configuration with visual builder and code editor
 */

import type { MappingBoxOptions, MappingBoxAPI, MappingMode } from './types';
import type { Mapping } from '@walkeros/core';
import { createBox } from '../../atoms/box';
import { createButton } from '../../atoms/button';
import { createElement } from '../../lib/dom';
import { MappingModel } from './model';
import { createCodeView } from './views/code';
import { createVisualView } from './views/visual';

/**
 * Create a mapping box component
 */
export function createMappingBox(
  element: HTMLElement,
  options: MappingBoxOptions = {},
): MappingBoxAPI {
  // State
  let currentMode: MappingMode = options.mode || 'visual';
  // Start with empty model by default, user can pass initial value
  const model = new MappingModel(options.value || {});

  // Create mode toggle container for header center
  const toggleContainer = createElement('div', {
    class: 'elb-tab-group',
  });

  // Create controls container for header right
  let controlsContainer: HTMLElement | undefined;
  if (options.showControls) {
    controlsContainer = createElement('div', {
      class: 'elb-mapping-box-controls',
    });
  }

  // Create main box container
  const box = createBox(element, {
    label: options.label || 'Mapping',
    showHeader: true,
    className: 'elb-mapping-box',
    headerCenter: toggleContainer,
    headerRight: controlsContainer,
  });

  // Get content area
  const content = box.getContent();

  // Create view containers
  const visualContainer = createElement('div', {
    class: 'elb-mapping-visual',
    style: currentMode === 'visual' ? '' : 'display: none;',
  });

  const codeContainer = createElement('div', {
    class: 'elb-mapping-code',
    style: currentMode === 'code' ? '' : 'display: none;',
  });

  content.appendChild(visualContainer);
  content.appendChild(codeContainer);

  // Create views
  const codeView = createCodeView(codeContainer, {
    value: model.toJSON(),
    onChange: (value) => {
      try {
        const parsed = JSON.parse(value);
        model.fromJSON(parsed);
      } catch (e) {
        // Invalid JSON, don't update model
      }
    },
    readOnly: options.readOnly,
  });

  const visualView = createVisualView(visualContainer, {
    model,
    readOnly: options.readOnly,
    showConfigurationManager: options.showConfigurationManager !== false,
  });

  // Create mode toggle buttons
  const visualBtn = createButton(toggleContainer, {
    text: 'Visual',
    variant: 'tab',
    active: currentMode === 'visual',
    onClick: () => setMode('visual'),
  });

  const codeBtn = createButton(toggleContainer, {
    text: 'Code',
    variant: 'tab',
    active: currentMode === 'code',
    onClick: () => setMode('code'),
  });

  // Add control buttons if enabled
  if (options.showControls && controlsContainer) {
    createButton(controlsContainer, {
      text: 'Clear',
      variant: 'ghost',
      onClick: () => {
        if (confirm('Clear all mappings? This action cannot be undone.')) {
          model.fromJSON({});
          updateViews();
        }
      },
    });

    createButton(controlsContainer, {
      text: 'Validate',
      variant: 'ghost',
      onClick: () => {
        const result = model.validate();
        console.log('Validation result:', result);
      },
    });
  }

  // Mode management
  function setMode(mode: MappingMode): void {
    if (mode === currentMode) return;

    currentMode = mode;

    // Update button states
    if (mode === 'visual') {
      visualBtn.setActive(true);
      codeBtn.setActive(false);
      visualContainer.style.display = '';
      codeContainer.style.display = 'none';
    } else {
      visualBtn.setActive(false);
      codeBtn.setActive(true);
      visualContainer.style.display = 'none';
      codeContainer.style.display = '';
    }

    // Notify mode change
    if (options.onModeChange) {
      options.onModeChange(mode);
    }

    // Ensure views are synced
    updateViews();
  }

  // Sync views with model
  function updateViews(): void {
    const data = model.toJSON();

    // Update code view
    codeView.setValue(JSON.stringify(data, null, 2));

    // Visual view updates itself through model events
  }

  // Listen to model changes
  model.on('change', (data) => {
    // Update code view when model changes from visual view
    if (currentMode === 'visual') {
      codeView.setValue(JSON.stringify(data, null, 2));
    }

    // Notify external change handler
    if (options.onChange) {
      options.onChange(data);
    }
  });

  // API
  const api: MappingBoxAPI = {
    getValue(): Mapping.Rules {
      return model.toJSON();
    },

    setValue(mapping: Mapping.Rules): void {
      model.fromJSON(mapping);
      updateViews();
    },

    clear(): void {
      model.fromJSON({});
      updateViews();
    },

    getMode(): MappingMode {
      return currentMode;
    },

    setMode(mode: MappingMode): void {
      setMode(mode);
    },

    validate() {
      return model.validate();
    },

    destroy(): void {
      codeView.destroy();
      visualView.destroy();
      box.destroy();
    },
  };

  return api;
}

// Export types for external use
export type { MappingBoxOptions, MappingBoxAPI, MappingMode } from './types';
