import type { FieldProps } from '@rjsf/utils';
import { MappingObjectExplorerWidget } from './mapping-object-explorer';

/**
 * MappingObjectExplorerField - RJSF field wrapper for object exploration
 *
 * Bridges RJSF FieldProps to our custom MappingObjectExplorerWidget.
 * Required because RJSF uses fields (not widgets) for object types.
 *
 * This is the proper RJSF pattern for custom object rendering.
 * Objects in RJSF are handled by Fields, primitives by Widgets.
 *
 * @example
 * // Register in field registry:
 * export const mappingFields: RegistryFieldsType = {
 *   objectExplorer: MappingObjectExplorerField,
 * };
 *
 * @example
 * // Use in uiSchema:
 * const uiSchema = {
 *   'ui:field': 'objectExplorer',
 *   'ui:options': {
 *     allowAdd: true,
 *     allowRename: true,
 *     showBadges: true,
 *   }
 * };
 */
export function MappingObjectExplorerField(props: FieldProps) {
  const {
    formData,
    onChange,
    schema,
    uiSchema,
    idSchema,
    formContext,
    disabled,
    readonly,
  } = props;

  const widgetProps = {
    id: idSchema.$id,
    value: formData,
    onChange,
    schema,
    uiSchema,
    options: uiSchema?.['ui:options'] || {},
    formContext,
    disabled: disabled || false,
    readonly: readonly || false,
    label: schema.title || '',
    rawErrors: [],
  };

  // @ts-expect-error - WidgetProps type mismatch, consistent with other mapping fields
  return <MappingObjectExplorerWidget {...widgetProps} />;
}

export default MappingObjectExplorerField;
