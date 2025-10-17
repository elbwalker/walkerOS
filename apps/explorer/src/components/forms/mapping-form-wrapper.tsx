import React from 'react';
import Form from '@rjsf/core';
import type { RJSFSchema, UiSchema } from '@rjsf/utils';
import validator from '@rjsf/validator-ajv8';
import { mappingWidgets } from './widget-registry';
import { mappingFields } from './field-registry';
import { MappingGrid } from '../atoms/mapping-grid';

export interface MappingFormWrapperProps {
  schema: RJSFSchema;
  uiSchema?: UiSchema;
  formData?: unknown;
  onChange?: (data: unknown) => void;
  onSubmit?: (data: unknown) => void;
  children?: React.ReactNode;
}

/**
 * MappingFormWrapper - RJSF Form wrapper with theme integration
 *
 * Wraps react-jsonschema-form with custom theming, templates, and widgets.
 * Integrates with the explorer's CSS variable system and provides custom
 * layouts using MappingGrid.
 *
 * Features:
 * - Custom FieldTemplate with proper label/input styling
 * - Custom ObjectFieldTemplate using MappingGrid for layout
 * - Theme integration via CSS variables
 * - Custom widget registry
 * - Form context support
 *
 * @example
 * const schema = {
 *   type: 'object',
 *   properties: {
 *     name: { type: 'string', title: 'Name' },
 *     priority: { type: 'number', title: 'Priority' }
 *   }
 * };
 *
 * <MappingFormWrapper
 *   schema={schema}
 *   formData={data}
 *   onChange={setData}
 * />
 */
export function MappingFormWrapper({
  schema,
  uiSchema,
  formData,
  onChange,
  onSubmit,
  children,
}: MappingFormWrapperProps) {
  const handleChange = (event: { formData: unknown }) => {
    onChange?.(event.formData);
  };

  const handleSubmit = (event: { formData: unknown }) => {
    onSubmit?.(event.formData);
  };

  return (
    <div className="elb-rjsf-form-wrapper">
      <Form
        schema={schema}
        uiSchema={uiSchema}
        formData={formData}
        validator={validator}
        widgets={mappingWidgets}
        fields={mappingFields}
        onChange={handleChange}
        onSubmit={handleSubmit}
        templates={{
          FieldTemplate: CustomFieldTemplate,
          ObjectFieldTemplate: CustomObjectFieldTemplate,
        }}
        showErrorList={false}
      >
        {/* Hide default submit button - we use custom Save button in parent */}
        <div style={{ display: 'none' }} />
      </Form>
    </div>
  );
}

/**
 * Custom FieldTemplate
 *
 * Provides consistent styling for all form fields:
 * - Label with proper typography
 * - Field wrapper with spacing
 * - Error display
 * - Help text support
 */
function CustomFieldTemplate(props: any) {
  const {
    id,
    classNames,
    label,
    help,
    required,
    description,
    errors,
    children,
    hidden,
    schema,
  } = props;

  if (hidden) {
    return <div className="elb-rjsf-field-hidden">{children}</div>;
  }

  // For object fields (like consent), hide label and description as the widget handles them
  const showLabelAndDescription = schema.type !== 'object';

  return (
    <div className={`elb-rjsf-field ${classNames || ''}`} id={id}>
      {showLabelAndDescription && label && (
        <label htmlFor={id} className="elb-rjsf-label">
          {label}
          {required && <span className="elb-rjsf-required"> *</span>}
        </label>
      )}
      {showLabelAndDescription && description && (
        <div className="elb-rjsf-description">{description}</div>
      )}
      {children}
      {errors}
      {help && <div className="elb-rjsf-help">{help}</div>}
    </div>
  );
}

/**
 * Custom ObjectFieldTemplate
 *
 * Uses MappingGrid for laying out object properties in a responsive grid.
 * Properties are arranged in a 2-column layout on larger screens,
 * single column on mobile.
 */
function CustomObjectFieldTemplate(props: any) {
  const { title, description, properties, uiSchema } = props;

  // Get layout preference from uiSchema
  const layout = uiSchema?.['ui:layout'] || 'cols-2';
  const responsive = uiSchema?.['ui:responsive'] !== false;

  return (
    <fieldset className="elb-rjsf-object">
      {title && <legend className="elb-rjsf-object-title">{title}</legend>}
      {description && (
        <div className="elb-rjsf-object-description">{description}</div>
      )}
      <MappingGrid layout={layout} responsive={responsive} gap={16}>
        {properties.map((element: any) => (
          <div key={element.name} className="elb-rjsf-object-property">
            {element.content}
          </div>
        ))}
      </MappingGrid>
    </fieldset>
  );
}
