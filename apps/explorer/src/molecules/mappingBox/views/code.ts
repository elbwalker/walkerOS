/**
 * Code View for MappingBox
 * JSON editor view for mapping configuration
 */

import { createEditor } from '../../../atoms/editor';
import type { EditorAPI } from '../../../types';

export interface CodeViewOptions {
  value: any;
  onChange?: (value: string) => void;
  readOnly?: boolean;
}

export interface CodeViewAPI {
  setValue(value: string): void;
  getValue(): string;
  destroy(): void;
}

export function createCodeView(
  container: HTMLElement,
  options: CodeViewOptions,
): CodeViewAPI {
  // Create editor
  const editor = createEditor(container, {
    value: JSON.stringify(options.value, null, 2),
    language: 'json',
    readOnly: options.readOnly,
    lineNumbers: true,
    onChange: (value) => {
      if (options.onChange) {
        options.onChange(value);
      }
    },
  });

  // API
  return {
    setValue(value: string): void {
      editor.setValue(value);
    },

    getValue(): string {
      return editor.getValue();
    },

    destroy(): void {
      editor.destroy();
    },
  };
}
