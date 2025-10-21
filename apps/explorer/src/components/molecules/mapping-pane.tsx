import { MappingEntityPane } from './mapping-entity-pane';
import { MappingRuleOverview } from './mapping-rule-overview';
import { MappingValueConfigPaneView } from './mapping-value-config-pane-view';
import { MappingKeyPaneView } from './mapping-key-pane-view';
import { MappingConditionPaneView } from './mapping-condition-pane-view';
import { MappingNamePaneView } from './mapping-name-pane-view';
import { MappingBatchPaneView } from './mapping-batch-pane-view';
import { MappingIgnorePaneView } from './mapping-ignore-pane-view';
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
 * - 'name' → MappingNamePaneView - Simple string input for event name override
 * - 'batch' → MappingBatchPaneView - Number input for batch size configuration
 * - 'ignore' → MappingIgnorePaneView - Boolean toggle to ignore rule
 * - 'property' → MappingTypeGrid - Shows type selection grid
 * - 'valueConfig' → MappingValueConfigPaneView - Full ValueConfig editor
 * - 'key' → MappingKeyPaneView - Focused key property editor
 * - 'condition' → MappingConditionPaneView - Condition function editor
 * - 'map' → (Coming soon) - Map transformation editor
 * - 'loop' → (Coming soon) - Loop transformation editor
 * - 'set' → (Coming soon) - Set transformation editor
 * - 'value' → (Coming soon) - Static value editor
 * - 'fn' → (Coming soon) - Function editor
 * - 'validate' → (Coming soon) - Validate function editor
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

    case 'key':
      // MappingKeyPaneView has its own structure
      return (
        <MappingKeyPaneView
          path={path}
          mappingState={mappingState}
          className={className}
        />
      );

    case 'condition':
      // MappingConditionPaneView has its own structure
      return (
        <MappingConditionPaneView
          path={path}
          mappingState={mappingState}
          className={className}
        />
      );

    // All other cases use the standard pane wrapper with scrolling content
    case 'property':
    case 'valueConfig':
    case 'map':
    case 'loop':
    case 'set':
    case 'value':
    case 'fn':
    case 'validate':
    case 'consent':
    default: {
      let content: React.ReactNode;

      if (nodeType === 'property') {
        content = (
          <MappingTypeGrid
            path={path}
            mappingState={mappingState}
            onSelectType={handleSelectType}
            className=""
          />
        );
      } else if (nodeType === 'valueConfig') {
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
        nodeType === 'set' ||
        nodeType === 'value' ||
        nodeType === 'fn' ||
        nodeType === 'validate' ||
        nodeType === 'consent'
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
