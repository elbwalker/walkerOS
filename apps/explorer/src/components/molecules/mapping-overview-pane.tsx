import { useState, useEffect } from 'react';
import type { UseMappingStateReturn } from '../../hooks/useMappingState';
import type { UseMappingNavigationReturn } from '../../hooks/useMappingNavigation';
import { PaneHeader } from '../atoms/pane-header';
import { MappingInput } from '../atoms/mapping-input';

/**
 * Overview Pane - Shows all entity-action pairs as tiles
 *
 * Displays when no specific tab is selected
 */
export interface MappingOverviewPaneProps {
  mappingState: UseMappingStateReturn;
  navigation: UseMappingNavigationReturn;
  className?: string;
}

export function MappingOverviewPane({
  mappingState,
  navigation,
  className = '',
}: MappingOverviewPaneProps) {
  const config = mappingState.config;
  const [newEntityName, setNewEntityName] = useState('');
  const [entityExists, setEntityExists] = useState(false);

  // Build list of all entity-action pairs
  const rules: Array<{ entity: string; action: string }> = [];

  Object.keys(config)
    .sort()
    .forEach((entity) => {
      const entityConfig = config[entity] as Record<string, unknown>;
      if (entityConfig && typeof entityConfig === 'object') {
        Object.keys(entityConfig)
          .sort()
          .forEach((action) => {
            rules.push({ entity, action });
          });
      }
    });

  const handleRuleClick = (entity: string, action: string) => {
    navigation.openTab([entity, action], 'rule');
  };

  const handleEntityInputChange = (value: string) => {
    setNewEntityName(value);
    // Check if entity exists
    setEntityExists(config[value] !== undefined);
  };

  const handleEntitySubmit = () => {
    const entityName = newEntityName.trim();
    if (!entityName) {
      setNewEntityName('');
      return;
    }

    if (entityExists) {
      // Navigate to existing entity
      navigation.openTab([entityName], 'entity');
    } else {
      // Create new entity
      mappingState.actions.setValue([entityName], {});
      navigation.openTab([entityName], 'entity');
    }

    setNewEntityName('');
    setEntityExists(false);
  };

  const handleEntityKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleEntitySubmit();
    } else if (e.key === 'Escape') {
      setNewEntityName('');
      setEntityExists(false);
    }
  };

  const handleEntityBlur = () => {
    setTimeout(() => {
      handleEntitySubmit();
    }, 150);
  };

  return (
    <div className={`elb-mapping-pane ${className}`}>
      <div className="elb-mapping-pane-content">
        <PaneHeader
          title="Overview"
          description={
            rules.length === 0
              ? 'No rules yet. Create an entity to get started.'
              : `${rules.length} rule${rules.length === 1 ? '' : 's'}`
          }
          onBack={navigation.goBack}
          canGoBack={navigation.canGoBack()}
        />

        <div className="elb-mapping-overview-input-section">
          <MappingInput
            value={newEntityName}
            onChange={handleEntityInputChange}
            onKeyDown={handleEntityKeyDown}
            onBlur={handleEntityBlur}
            placeholder="Type entity name to create or select..."
            className={entityExists ? 'is-existing' : ''}
          />
        </div>

        {rules.length > 0 && (
          <div className="elb-mapping-overview-grid">
            {rules.map(({ entity, action }) => (
              <button
                key={`${entity}.${action}`}
                type="button"
                className="elb-mapping-overview-tile"
                onClick={() => handleRuleClick(entity, action)}
              >
                <div className="elb-mapping-overview-tile-entity">{entity}</div>
                <div className="elb-mapping-overview-tile-action">{action}</div>
              </button>
            ))}
          </div>
        )}

        {rules.length === 0 && (
          <div className="elb-mapping-overview-empty">
            <p>
              Use the tree sidebar or breadcrumb to create your first entity and
              action.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
