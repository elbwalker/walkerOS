import {
  ConfigEditorBox,
  type ConfigEditorBoxProps,
} from './config-editor-box';

/**
 * ConfigEditor - Generic Visual Configuration Editor
 *
 * A fully generic configuration editor that works at ANY depth with ANY config type.
 * Uses structure definitions and schemas to provide appropriate editing UI.
 *
 * Key Features:
 * - Works at any depth (full config or nested object)
 * - Structure-driven (no hardcoded assumptions)
 * - Schema-aware (validation, type hints, metadata)
 * - Code/Visual toggle
 * - Tree navigation
 * - Validation with error overview
 * - TypeScript generic for type safety
 *
 * @example
 * // Full DestinationConfig
 * <ConfigEditor
 *   config={destinationConfig}
 *   onChange={setConfig}
 *   structure={DESTINATION_CONFIG_STRUCTURE}
 *   schemas={metaSchemas}
 *   label="Meta Pixel Configuration"
 * />
 *
 * @example
 * // Single Rule (deep nested)
 * <ConfigEditor
 *   config={pageViewRule}
 *   onChange={setRule}
 *   structure={MAPPING_RULE_STRUCTURE}
 *   schemas={{ mapping: mappingSchema }}
 *   label="Page View Rule"
 *   showTree={false}
 * />
 *
 * @example
 * // Read-only (no onChange)
 * <ConfigEditor
 *   config={destinationConfig}
 *   structure={DESTINATION_CONFIG_STRUCTURE}
 *   initialTab="code"
 * />
 */
export function ConfigEditor<T extends Record<string, unknown>>(
  props: ConfigEditorBoxProps<T>,
) {
  return <ConfigEditorBox {...props} />;
}
