import { MappingEntityPane } from './mapping-entity-pane';
import { MappingRuleOverview } from './mapping-rule-overview';
import { MappingPolicyOverviewPane } from './mapping-policy-overview-pane';
import { MappingValueConfigPaneView } from './mapping-value-config-pane-view';
import { MappingValueTypePaneView } from './mapping-value-type-pane-view';
import { MappingValuePaneView } from './mapping-value-pane-view';
import { MappingKeyPaneView } from './mapping-key-pane-view';
import { MappingConditionPaneView } from './mapping-condition-pane-view';
import { MappingFnPaneView } from './mapping-fn-pane-view';
import { MappingValidatePaneView } from './mapping-validate-pane-view';
import { MappingNamePaneView } from './mapping-name-pane-view';
import { MappingBatchPaneView } from './mapping-batch-pane-view';
import { MappingConsentPaneView } from './mapping-consent-pane-view';
import { MappingSetPaneView } from './mapping-set-pane-view';
import { MappingLoopPaneView } from './mapping-loop-pane-view';
import { MappingMapPaneViewRJSF } from './mapping-map-pane-view-rjsf';
import { MappingEnumPaneView } from './mapping-enum-pane-view';
import { MappingBooleanPaneView } from './mapping-boolean-pane-view';
import { MappingPrimitivePaneView } from './mapping-primitive-pane-view';
import { SettingsOverviewPane } from './settings-overview-pane';
import type { NodeType } from '../../hooks/useMappingNavigation';
import type { UseMappingStateReturn } from '../../hooks/useMappingState';
import type { UseMappingNavigationReturn } from '../../hooks/useMappingNavigation';
import type { DestinationSchemas } from '../organisms/mapping-box';
import type { RJSFSchema, UiSchema } from '@rjsf/utils';
import {
  navigateSettingsSchema,
  navigateMappingSettingsSchema,
} from '../../utils/type-detector';
import {
  getRulePropertySchema,
  getRulePropertyUiSchema,
} from '../../schemas/rule-properties-schema';

/**
 * Get JSON Schema for a given path
 */
function getSchemaForPath(
  path: string[],
  schemas?: DestinationSchemas,
): RJSFSchema | undefined {
  // Config-level settings: ['settings', 'pixelId']
  if (path.length >= 2 && path[0] === 'settings' && schemas?.settings) {
    return navigateSettingsSchema(path, schemas.settings) || undefined;
  }

  // Rule-level mapping settings: ['mapping', 'product', 'view', 'settings', 'track']
  if (path.includes('settings') && schemas?.mapping) {
    return navigateMappingSettingsSchema(path, schemas.mapping) || undefined;
  }

  // Universal rule properties: ['mapping', 'product', 'view', 'name']
  // or ['product', 'view', 'name'] (legacy paths)
  const propertyKey = path[path.length - 1];
  const rulePropertySchema = getRulePropertySchema(propertyKey);
  if (rulePropertySchema) {
    return rulePropertySchema;
  }

  return undefined;
}

/**
 * Get UI Schema for a given path
 */
function getUiSchemaForPath(
  path: string[],
  schemas?: DestinationSchemas,
): UiSchema | undefined {
  // Config-level settings UI schema
  if (path.length >= 2 && path[0] === 'settings' && schemas?.settingsUi) {
    // Navigate to the property in UI schema
    const propertyKey = path[path.length - 1];
    return schemas.settingsUi[propertyKey];
  }

  // Rule-level mapping settings UI schema
  if (path.includes('settings') && schemas?.mappingUi) {
    // Navigate to the property in UI schema
    const propertyKey = path[path.length - 1];
    return schemas.mappingUi[propertyKey];
  }

  // Universal rule properties UI schema
  const propertyKey = path[path.length - 1];
  const rulePropertyUiSchema = getRulePropertyUiSchema(propertyKey);
  if (rulePropertyUiSchema) {
    return rulePropertyUiSchema;
  }

  return undefined;
}

/**
 * Mapping Pane Router - Pure Presentation Component
 *
 * Routes to the appropriate pane component based on node type.
 * This is a simple router that delegates to specialized pane views.
 *
 * Supported node types:
 * - 'entity' → MappingEntityPane - Shows list of actions
 * - 'rule' → MappingRuleOverview - Shows rule properties grid
 * - 'policy' → MappingPolicyOverviewPane - Shows list of policy rules with badges
 * - 'name' → MappingNamePaneView - Simple string input for event name override
 * - 'batch' → MappingBatchPaneView - Number input for batch size configuration
 * - 'consent' → MappingConsentPaneView - Consent state tiles with discovery
 * - 'valueConfig' → MappingValueConfigPaneView - Full ValueConfig editor
 * - 'valueType' → MappingValueTypePaneView - String or ValueConfig editor (replaces old property/type-grid)
 * - 'enum' → MappingEnumPaneView - Dropdown selector for schema-defined enum fields
 * - 'boolean' → MappingBooleanPaneView - Toggle switch for boolean settings
 * - 'key' → MappingKeyPaneView - Focused key property editor
 * - 'condition' → MappingConditionPaneView - Condition function editor
 * - 'value' → MappingValuePaneView - Primitive value editor (string, number, boolean)
 * - 'fn' → MappingFnPaneView - Transformation function editor
 * - 'validate' → MappingValidatePaneView - Validation function editor
 * - 'set' → MappingSetPaneView - Array of values with drag-and-drop
 * - 'loop' → MappingLoopPaneView - Loop transformation editor
 * - 'map' → MappingMapPaneView - Map object editor (key-value pairs)
 *
 * @example
 * <MappingPane
 *   nodeType="rule"
 *   path={['product', 'view']}
 *   mappingState={mappingState}
 *   navigation={navigation}
 * />
 */
export interface MappingPaneProps {
  nodeType: NodeType;
  path: string[];
  mappingState: UseMappingStateReturn;
  navigation: UseMappingNavigationReturn;
  className?: string;
  /** Destination schemas for type-aware settings editing */
  schemas?: DestinationSchemas;
}

export function MappingPane({
  nodeType,
  path,
  mappingState,
  navigation,
  className = '',
  schemas,
}: MappingPaneProps) {
  // Handle type selection from grid
  const handleSelectType = (type: string) => {
    // Navigate to the selected type
    navigation.openTab([...path, type], type as NodeType);
  };

  // Route to appropriate pane based on node type
  switch (nodeType) {
    case 'entity':
      // MappingEntityPane has its own .elb-mapping-entity-pane structure
      return (
        <MappingEntityPane
          path={path}
          mappingState={mappingState}
          navigation={navigation}
          className={className}
        />
      );

    case 'rule':
      // MappingRuleOverview uses standard .elb-mapping-pane structure
      return (
        <MappingRuleOverview
          path={path}
          mappingState={mappingState}
          navigation={navigation}
          className={className}
          schemas={schemas}
        />
      );

    case 'name':
      // MappingNamePaneView uses standard .elb-mapping-pane structure
      return (
        <MappingNamePaneView
          path={path}
          mappingState={mappingState}
          navigation={navigation}
          schema={getSchemaForPath(path, schemas)}
          uiSchema={getUiSchemaForPath(path, schemas)}
          className={className}
        />
      );

    case 'batch':
      // MappingBatchPaneView uses standard .elb-mapping-pane structure
      return (
        <MappingBatchPaneView
          path={path}
          mappingState={mappingState}
          navigation={navigation}
          schema={getSchemaForPath(path, schemas)}
          uiSchema={getUiSchemaForPath(path, schemas)}
          className={className}
        />
      );

    case 'consent':
      // MappingConsentPaneView uses standard .elb-mapping-pane structure
      return (
        <MappingConsentPaneView
          path={path}
          mappingState={mappingState}
          navigation={navigation}
          className={className}
        />
      );

    case 'policy':
      // MappingPolicyOverviewPane shows list of policy rules
      return (
        <MappingPolicyOverviewPane
          path={path}
          mappingState={mappingState}
          navigation={navigation}
          className={className}
        />
      );

    case 'condition':
      // MappingConditionPaneView uses standard .elb-mapping-pane structure
      return (
        <MappingConditionPaneView
          path={path}
          mappingState={mappingState}
          navigation={navigation}
          className={className}
        />
      );

    case 'value':
      // MappingValuePaneView uses standard .elb-mapping-pane structure
      return (
        <MappingValuePaneView
          path={path}
          mappingState={mappingState}
          navigation={navigation}
          className={className}
        />
      );

    case 'key':
      // MappingKeyPaneView uses standard .elb-mapping-pane structure
      return (
        <MappingKeyPaneView
          path={path}
          mappingState={mappingState}
          navigation={navigation}
          className={className}
        />
      );

    case 'fn':
      // MappingFnPaneView uses standard .elb-mapping-pane structure
      return (
        <MappingFnPaneView
          path={path}
          mappingState={mappingState}
          navigation={navigation}
          className={className}
        />
      );

    case 'validate':
      // MappingValidatePaneView uses standard .elb-mapping-pane structure
      return (
        <MappingValidatePaneView
          path={path}
          mappingState={mappingState}
          navigation={navigation}
          className={className}
        />
      );

    case 'valueType':
      // MappingValueTypePaneView for string | ValueConfig
      return (
        <MappingValueTypePaneView
          path={path}
          mappingState={mappingState}
          navigation={navigation}
          className={className}
        />
      );

    case 'enum':
      // MappingEnumPaneView for schema-defined enum fields
      return (
        <MappingEnumPaneView
          path={path}
          mappingState={mappingState}
          navigation={navigation}
          schemas={schemas}
          className={className}
        />
      );

    case 'boolean':
      // MappingBooleanPaneView for boolean toggle fields
      return (
        <MappingBooleanPaneView
          path={path}
          mappingState={mappingState}
          navigation={navigation}
          className={className}
        />
      );
    case 'primitive':
      // MappingPrimitivePaneView for schema-defined string/number primitives
      return (
        <MappingPrimitivePaneView
          path={path}
          mappingState={mappingState}
          navigation={navigation}
          schema={getSchemaForPath(path, schemas)}
          uiSchema={getUiSchemaForPath(path, schemas)}
          className={className}
        />
      );

    case 'set':
      // MappingSetPaneView uses standard .elb-mapping-pane structure
      return (
        <MappingSetPaneView
          path={path}
          mappingState={mappingState}
          navigation={navigation}
          className={className}
        />
      );

    case 'loop':
      // MappingLoopPaneView uses standard .elb-mapping-pane structure
      return (
        <MappingLoopPaneView
          path={path}
          mappingState={mappingState}
          navigation={navigation}
          className={className}
        />
      );

    case 'map':
      return (
        <MappingMapPaneViewRJSF
          path={path}
          mappingState={mappingState}
          navigation={navigation}
          schemas={schemas}
          className={className}
        />
      );

    case 'settings':
      // SettingsOverviewPane shows config-level settings as tiles
      return (
        <SettingsOverviewPane
          path={path}
          mappingState={mappingState}
          navigation={navigation}
          schema={schemas?.settings}
          className={className}
        />
      );

    // All other cases use the standard pane wrapper with scrolling content
    case 'valueConfig':
    default: {
      let content: React.ReactNode;

      if (nodeType === 'valueConfig') {
        content = (
          <MappingValueConfigPaneView
            path={path}
            mappingState={mappingState}
            navigation={navigation}
            className=""
          />
        );
      } else {
        content = (
          <div className="elb-mapping-pane-error">
            Unknown node type: {nodeType}
          </div>
        );
      }

      // Standard pane structure with scrollable content for all remaining types
      return (
        <div className={`elb-mapping-pane ${className}`}>
          <div className="elb-mapping-pane-content">{content}</div>
        </div>
      );
    }
  }
}
