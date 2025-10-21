import React from 'react';
import { MappingFormWrapper } from '../forms/mapping-form-wrapper';
import { PanelHints } from '../atoms/panel-hints';
import type { RJSFSchema } from '@rjsf/utils';
import type { MappingState } from '../../hooks/useMappingState';

/**
 * Key Pane View - Pure Presentation Component
 *
 * Focused editor for the 'key' property of ValueConfig.
 * Shows a simple text input for entering event path keys.
 *
 * Uses RJSF with custom MappingKeyField to render the input
 * with helpful hints about common path patterns.
 *
 * @example
 * <MappingKeyPaneView
 *   path={['product', 'view', 'data', 'key']}
 *   mappingState={mappingState}
 * />
 */
export interface MappingKeyPaneViewProps {
  path: string[];
  mappingState: MappingState;
  className?: string;
}

export function MappingKeyPaneView({
  path,
  mappingState,
  className = '',
}: MappingKeyPaneViewProps) {
  const value = mappingState.actions.getValue(path) as string | undefined;

  // Simple schema for key property
  const schema: RJSFSchema = {
    type: 'object',
    properties: {
      key: {
        type: 'string',
        title: 'Key',
        description: 'Extract value from event path',
      },
    },
  };

  const uiSchema = {
    'ui:layout': 'row', // Single column layout for the form
    key: {
      'ui:field': 'mappingKey',
      'ui:placeholder': 'e.g., data.id, user.email',
    },
  };

  const formData = {
    key: value || '',
  };

  const handleChange = (data: { formData?: { key?: string } }) => {
    const newKey = data.formData?.key;

    // When key is cleared (empty or undefined), delete it from mapping
    if (!newKey) {
      mappingState.actions.deleteValue(path);
    } else {
      // Otherwise set the new key value
      mappingState.actions.setValue(path, newKey);
    }
  };

  return (
    <div className={`elb-property-panel ${className}`}>
      <MappingFormWrapper
        schema={schema}
        uiSchema={uiSchema}
        formData={formData}
        onChange={handleChange}
        nested={true}
      />

      <PanelHints
        hints={[
          { code: 'data.*', description: 'Event data properties' },
          { code: 'user.id', description: 'User identifier' },
          { code: 'user.device', description: 'Device identifier' },
          { code: 'globals.*', description: 'Global properties' },
          { code: 'context.*', description: 'Context information' },
        ]}
      />
    </div>
  );
}
