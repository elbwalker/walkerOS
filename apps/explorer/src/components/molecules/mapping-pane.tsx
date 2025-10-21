import { MappingEntityPane } from './mapping-entity-pane';
import { MappingRuleOverview } from './mapping-rule-overview';
import { MappingTransformationTabs } from './mapping-transformation-tabs';
import { MappingValueConfigPaneView } from './mapping-value-config-pane-view';
import { MappingKeyPaneView } from './mapping-key-pane-view';
import { MappingConditionPaneView } from './mapping-condition-pane-view';
import { MappingTypeGrid } from './mapping-type-grid';
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
 * - 'property' → MappingTypeGrid - Shows type selection grid
 * - 'valueConfig' → MappingValueConfigPaneView - Full ValueConfig editor
 * - 'map' → MappingTransformationTabs - Map/Loop/Set transformation tabs
 * - 'loop' → MappingTransformationTabs - Map/Loop/Set transformation tabs
 * - 'set' → MappingTransformationTabs - Map/Loop/Set transformation tabs
 * - 'key' → MappingKeyPaneView - Focused key property editor
 * - 'value' → (Coming soon) - Static value editor
 * - 'fn' → (Coming soon) - Function editor
 * - 'validate' → (Coming soon) - Validate function editor
 * - 'condition' → (Coming soon) - Condition function editor
 * - 'consent' → (Coming soon) - Consent requirements editor
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
      // Show entity pane with action list
      return (
        <MappingEntityPane
          path={path}
          mappingState={mappingState}
          navigation={navigation}
          className={className}
        />
      );

    case 'rule':
      // Show clean overview grid
      return (
        <MappingRuleOverview
          path={path}
          mappingState={mappingState}
          navigation={navigation}
          className={className}
        />
      );

    case 'property':
      // Show type selection grid for properties
      return (
        <div className={`elb-mapping-pane ${className}`}>
          <MappingTypeGrid
            path={path}
            mappingState={mappingState}
            onSelectType={handleSelectType}
            className=""
          />
        </div>
      );

    case 'valueConfig':
      // Simple value editor (no header, just the editor)
      return (
        <div className={`elb-mapping-pane ${className}`}>
          <MappingValueConfigPaneView
            path={path}
            mappingState={mappingState}
            navigation={navigation}
            className=""
          />
        </div>
      );

    case 'map':
    case 'loop':
    case 'set':
      // Show transformation tabs (map/loop/fn/set)
      return (
        <MappingTransformationTabs
          path={path}
          mappingState={mappingState}
          className={className}
        />
      );

    case 'key':
      // Show focused key editor
      return (
        <MappingKeyPaneView
          path={path}
          mappingState={mappingState}
          className={className}
        />
      );

    case 'condition':
      // Show focused condition editor
      return (
        <MappingConditionPaneView
          path={path}
          mappingState={mappingState}
          className={className}
        />
      );

    case 'value':
    case 'fn':
    case 'validate':
    case 'consent':
      // TODO: Create dedicated pane views for each property type
      return (
        <div className={`elb-mapping-pane ${className}`}>
          <div className="elb-mapping-pane-info">
            {nodeType} editor - Coming soon
          </div>
        </div>
      );

    default:
      return (
        <div className={`elb-mapping-pane ${className}`}>
          <div className="elb-mapping-pane-error">
            Unknown node type: {nodeType}
          </div>
        </div>
      );
  }
}
