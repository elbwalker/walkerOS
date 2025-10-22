import { MappingEntityPane } from './mapping-entity-pane';
import { MappingRuleOverview } from './mapping-rule-overview';
import { MappingPolicyOverviewPane } from './mapping-policy-overview-pane';
import { MappingValueConfigPaneView } from './mapping-value-config-pane-view';
import { MappingValueTypePaneView } from './mapping-value-type-pane-view';
import { MappingValuePaneView } from './mapping-value-pane-view';
import { MappingConditionPaneView } from './mapping-condition-pane-view';
import { MappingFnPaneView } from './mapping-fn-pane-view';
import { MappingValidatePaneView } from './mapping-validate-pane-view';
import { MappingNamePaneView } from './mapping-name-pane-view';
import { MappingBatchPaneView } from './mapping-batch-pane-view';
import { MappingIgnorePaneView } from './mapping-ignore-pane-view';
import { MappingConsentPaneView } from './mapping-consent-pane-view';
import type { NodeType } from '../../hooks/useMappingNavigation';
import type { MappingState } from '../../hooks/useMappingState';
import type { MappingNavigation } from '../../hooks/useMappingNavigation';

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
 * - 'ignore' → MappingIgnorePaneView - Boolean toggle to ignore rule
 * - 'consent' → MappingConsentPaneView - Consent state tiles with discovery
 * - 'valueConfig' → MappingValueConfigPaneView - Full ValueConfig editor
 * - 'valueType' → MappingValueTypePaneView - String or ValueConfig editor (replaces old property/type-grid)
 * - 'key' → MappingKeyPaneView - Focused key property editor
 * - 'condition' → MappingConditionPaneView - Condition function editor
 * - 'value' → MappingValuePaneView - Primitive value editor (string, number, boolean)
 * - 'fn' → MappingFnPaneView - Transformation function editor
 * - 'validate' → MappingValidatePaneView - Validation function editor
 * - 'map' → (Coming soon) - Map transformation editor
 * - 'loop' → (Coming soon) - Loop transformation editor
 * - 'set' → (Coming soon) - Set transformation editor
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
  mappingState: MappingState;
  navigation: MappingNavigation;
  className?: string;
}

export function MappingPane({
  nodeType,
  path,
  mappingState,
  navigation,
  className = '',
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
        />
      );

    case 'name':
      // MappingNamePaneView uses standard .elb-mapping-pane structure
      return (
        <MappingNamePaneView
          path={path}
          mappingState={mappingState}
          className={className}
        />
      );

    case 'batch':
      // MappingBatchPaneView uses standard .elb-mapping-pane structure
      return (
        <MappingBatchPaneView
          path={path}
          mappingState={mappingState}
          className={className}
        />
      );

    case 'ignore':
      // MappingIgnorePaneView uses standard .elb-mapping-pane structure
      return (
        <MappingIgnorePaneView
          path={path}
          mappingState={mappingState}
          className={className}
        />
      );

    case 'consent':
      // MappingConsentPaneView uses standard .elb-mapping-pane structure
      return (
        <MappingConsentPaneView
          path={path}
          mappingState={mappingState}
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
          className={className}
        />
      );

    case 'value':
      // MappingValuePaneView uses standard .elb-mapping-pane structure
      return (
        <MappingValuePaneView
          path={path}
          mappingState={mappingState}
          className={className}
        />
      );

    case 'fn':
      // MappingFnPaneView uses standard .elb-mapping-pane structure
      return (
        <MappingFnPaneView
          path={path}
          mappingState={mappingState}
          className={className}
        />
      );

    case 'validate':
      // MappingValidatePaneView uses standard .elb-mapping-pane structure
      return (
        <MappingValidatePaneView
          path={path}
          mappingState={mappingState}
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

    // All other cases use the standard pane wrapper with scrolling content
    case 'valueConfig':
    case 'map':
    case 'loop':
    case 'set':
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
      } else if (
        nodeType === 'map' ||
        nodeType === 'loop' ||
        nodeType === 'set'
      ) {
        content = (
          <div className="elb-mapping-pane-info">
            {nodeType} editor - Coming soon
          </div>
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
