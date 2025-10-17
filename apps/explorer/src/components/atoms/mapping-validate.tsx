import React from 'react';
import type { WidgetProps } from '@rjsf/utils';
import { MappingCollapsible } from './mapping-collapsible';
import { CodeBox } from '../organisms/code-box';

/**
 * Default validate function template
 * Provides a starting point for users with parameter hints
 */
const DEFAULT_VALIDATE = `(value) => {
  // Return true if value is valid
  // value: The result from key/fn/map/etc
  return value !== undefined;
}`;

/**
 * MappingValidateWidget - RJSF widget for validate functions
 *
 * Manages validate functions as strings for ValueConfig.
 * A validate function checks if the mapped value is valid.
 *
 * States:
 * - Unchecked (default): No validation, value is undefined
 * - Checked: Shows code editor with function template
 *
 * @example
 * // In schema:
 * const schema = {
 *   type: 'object',
 *   properties: {
 *     validate: {
 *       type: 'string',
 *       title: 'Validate',
 *       description: 'Validate the result'
 *     }
 *   }
 * }
 *
 * @example
 * // In uiSchema:
 * const uiSchema = {
 *   validate: {
 *     'ui:field': 'mappingValidate'
 *   }
 * }
 */
export function MappingValidateWidget(props: WidgetProps) {
  const {
    id,
    value,
    onChange,
    disabled,
    readonly,
    rawErrors = [],
    schema,
  } = props;

  const validateCode = (value as string | undefined) || '';
  const hasValidate = Boolean(validateCode);

  // Extract title and description from schema
  const title = schema?.title || 'Validate';
  const description = schema?.description;

  const handleCheckboxChange = (checked: boolean) => {
    if (checked) {
      // Enable validate - set to default template
      onChange(DEFAULT_VALIDATE);
    } else {
      // Disable validate - set to undefined
      onChange(undefined);
    }
  };

  const handleCodeChange = (code: string) => {
    // Update the validate code
    onChange(code || undefined);
  };

  const hasError = rawErrors && rawErrors.length > 0;

  return (
    <div className="elb-rjsf-widget">
      <MappingCollapsible
        mode="checkbox"
        title={title}
        description={description}
        checked={hasValidate}
        onCheckedChange={handleCheckboxChange}
        disabled={disabled || readonly}
      >
        <CodeBox
          code={validateCode}
          onChange={handleCodeChange}
          language="javascript"
          label="Validate Function"
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
