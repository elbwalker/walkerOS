import React from 'react';
import { MappingFormWrapper } from '../forms/mapping-form-wrapper';
import { PanelHints } from '../atoms/panel-hints';
import type { RJSFSchema } from '@rjsf/utils';
import type { MappingState } from '../../hooks/useMappingState';

/**
 * Condition Pane View - Pure Presentation Component
 *
 * Focused editor for the 'condition' property of ValueConfig.
 * Shows a checkbox collapsible with a code editor for JavaScript functions
 * that determine whether a mapping should be applied.
 *
 * Uses RJSF with custom MappingConditionField to render:
 * - Checkbox to enable/disable condition
 * - Code editor with syntax highlighting
 * - Default template with function signature
 *
 * @example
 * <MappingConditionPaneView
 *   path={['product', 'view', 'data', 'condition']}
 *   mappingState={mappingState}
 * />
 */
export interface MappingConditionPaneViewProps {
  path: string[];
  mappingState: MappingState;
  className?: string;
}

export function MappingConditionPaneView({
  path,
  mappingState,
  className = '',
}: MappingConditionPaneViewProps) {
  const value = mappingState.actions.getValue(path) as string | undefined;

  // Simple schema for condition property
  const schema: RJSFSchema = {
    type: 'object',
    properties: {
      condition: {
        type: 'string',
        title: 'Condition',
        description:
          'Function that returns true to apply this mapping, false to skip it',
      },
    },
  };

  const uiSchema = {
    'ui:layout': 'row', // Single column layout for the form
    condition: {
      'ui:field': 'mappingCondition',
    },
  };

  const formData = {
    condition: value || undefined,
  };

  const handleChange = (data: { formData?: { condition?: string } }) => {
    const newCondition = data.formData?.condition;

    // When condition is cleared (empty or undefined), delete it from mapping
    if (!newCondition) {
      mappingState.actions.deleteValue(path);
    } else {
      // Otherwise set the new condition value
      mappingState.actions.setValue(path, newCondition);
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
          {
            code: 'value.data?.price > 100',
            description: 'Check event property value',
          },
          {
            code: 'value.user?.type === "premium"',
            description: 'Check user attributes',
          },
          {
            code: 'value.context?.stage?.[0] === "checkout"',
            description: 'Check context state',
          },
          {
            code: 'value.consent?.marketing === true',
            description: 'Check consent status',
          },
        ]}
      />
    </div>
  );
}
