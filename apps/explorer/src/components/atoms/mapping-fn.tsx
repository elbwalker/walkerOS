import React from 'react';
import type { WidgetProps } from '@rjsf/utils';
import { MappingCollapsible } from './mapping-collapsible';
import { CodeBox } from '../organisms/code-box';

/**
 * Default fn function template
 * Provides a starting point for users with parameter hints
 */
const DEFAULT_FN = `(value, mapping, options) => {
  // Transform the value
  // value: Input value from event or previous transformation
  // mapping: The current mapping configuration
  // options: { consent, collector, props }
  return value;
}`;

/**
 * MappingFnWidget - RJSF widget for custom transformation functions
 *
 * Manages fn (transformation) functions as strings for ValueConfig.
 * A fn function transforms values from one format to another.
 *
 * States:
 * - Unchecked (default): No transformation, value is undefined
 * - Checked: Shows code editor with function template
 *
 * @example
 * // In schema:
 * const schema = {
 *   type: 'object',
 *   properties: {
 *     fn: {
 *       type: 'string',
 *       title: 'Function',
 *       description: 'Custom transformation function'
 *     }
 *   }
 * }
 *
 * @example
 * // In uiSchema:
 * const uiSchema = {
 *   fn: {
 *     'ui:field': 'mappingFn'
 *   }
 * }
 */
export function MappingFnWidget(props: WidgetProps) {
  const {
    id,
    value,
    onChange,
    disabled,
    readonly,
    rawErrors = [],
    schema,
  } = props;

  const fnCode = (value as string | undefined) || '';
  const hasFn = Boolean(fnCode);

  // Extract title and description from schema
  const title = schema?.title || 'Function';
  const description = schema?.description;

  const handleCheckboxChange = (checked: boolean) => {
    if (checked) {
      // Enable fn - set to default template
      onChange(DEFAULT_FN);
    } else {
      // Disable fn - set to undefined
      onChange(undefined);
    }
  };

  const handleCodeChange = (code: string) => {
    // Update the fn code
    onChange(code || undefined);
  };

  const hasError = rawErrors && rawErrors.length > 0;

  return (
    <div className="elb-rjsf-widget">
      <MappingCollapsible
        mode="checkbox"
        title={title}
        description={description}
        checked={hasFn}
        onCheckedChange={handleCheckboxChange}
        disabled={disabled || readonly}
      >
        <CodeBox
          code={fnCode}
          onChange={handleCodeChange}
          language="javascript"
          label="Transformation Function"
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
