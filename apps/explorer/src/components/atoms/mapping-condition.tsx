import React from 'react';
import type { WidgetProps } from '@rjsf/utils';
import { MappingCollapsible } from './mapping-collapsible';
import { CodeBox } from '../organisms/code-box';

/**
 * Default condition function template
 * Provides a starting point for users with parameter hints
 */
const DEFAULT_CONDITION = `(value, mapping, collector) => {
  // Return true to apply this mapping rule
  // value: The event data
  // mapping: The mapping configuration
  // collector: The collector instance
  return true;
}`;

/**
 * MappingConditionWidget - RJSF widget for condition functions
 *
 * Manages condition functions as strings for mapping rules.
 * A condition determines whether a mapping rule should be applied.
 *
 * States:
 * - Unchecked (default): No condition, value is undefined
 * - Checked: Shows code editor with function template
 *
 * @example
 * // In schema:
 * const schema = {
 *   type: 'object',
 *   properties: {
 *     condition: {
 *       type: 'string',
 *       title: 'Use condition',
 *       description: 'Conditionally apply this mapping rule'
 *     }
 *   }
 * }
 *
 * @example
 * // In uiSchema:
 * const uiSchema = {
 *   condition: {
 *     'ui:widget': 'mappingCondition'
 *   }
 * }
 */
export function MappingConditionWidget(props: WidgetProps) {
  const {
    id,
    value,
    onChange,
    disabled,
    readonly,
    rawErrors = [],
    schema,
  } = props;

  const conditionCode = (value as string | undefined) || '';
  const hasCondition = Boolean(conditionCode);

  // Extract title and description from schema
  const title = schema?.title || 'Use condition';
  const description = schema?.description;

  const handleCheckboxChange = (checked: boolean) => {
    if (checked) {
      // Enable condition - set to default template
      onChange(DEFAULT_CONDITION);
    } else {
      // Disable condition - set to undefined
      onChange(undefined);
    }
  };

  const handleCodeChange = (code: string) => {
    // Update the condition code
    onChange(code || undefined);
  };

  const hasError = rawErrors && rawErrors.length > 0;

  return (
    <div className="elb-rjsf-widget">
      <MappingCollapsible
        mode="checkbox"
        title={title}
        description={description}
        checked={hasCondition}
        onCheckedChange={handleCheckboxChange}
        disabled={disabled || readonly}
      >
        <CodeBox
          code={conditionCode}
          onChange={handleCodeChange}
          language="javascript"
          label="Condition Function"
          autoHeight
          minHeight={100}
          maxHeight={400}
          lineNumbers
          folding={false}
          disabled={disabled || readonly}
        />
      </MappingCollapsible>
      {hasError && (
        <div className="elb-rjsf-error">
          {rawErrors.map((error, index) => (
            <div key={index}>{error}</div>
          ))}
        </div>
      )}
    </div>
  );
}
