import { useState, useEffect } from 'react';
import type { UseMappingStateReturn } from '../../hooks/useMappingState';
import type { UseMappingNavigationReturn } from '../../hooks/useMappingNavigation';
import { BaseMappingPane } from '../atoms/base-mapping-pane';
import { MappingInputWithButton } from '../atoms/mapping-input-with-button';

/**
 * Entity Pane - Shows actions for an entity
 *
 * Displays:
 * - List of existing actions for the entity
 * - Input field to create new actions
 */
export interface MappingEntityPaneProps {
  path: string[]; // Should be [entity]
  mappingState: UseMappingStateReturn;
  navigation: UseMappingNavigationReturn;
  className?: string;
}

export function MappingEntityPane({
  path,
  mappingState,
  navigation,
  className = '',
}: MappingEntityPaneProps) {
  const [newActionName, setNewActionName] = useState('');
  const [actionExists, setActionExists] = useState(false);

  const entity = path[0];
  const entityConfig = mappingState.actions.getValue([entity]) as
    | Record<string, unknown>
    | undefined;
  const actions =
    entityConfig && typeof entityConfig === 'object'
      ? Object.keys(entityConfig).sort()
      : [];

  // Check if action exists
  useEffect(() => {
    if (newActionName) {
      const exists = actions.includes(newActionName);
      setActionExists(exists);
    } else {
      setActionExists(false);
    }
  }, [newActionName, actions]);

  const handleActionInput = (value: string) => {
    setNewActionName(value);
  };

  const handleActionKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      setNewActionName('');
      setActionExists(false);
    }
  };

  const handleActionSubmit = () => {
    if (!newActionName.trim()) {
      setNewActionName('');
      return;
    }

    if (actionExists) {
      // Navigate to existing action
      navigation.openTab([entity, newActionName], 'rule');
      setNewActionName('');
      setActionExists(false);
    } else {
      // Create new action
      mappingState.actions.createRule(entity, newActionName.trim(), {});
      navigation.openTab([entity, newActionName.trim()], 'rule');
      setNewActionName('');
    }
  };

  const handleActionClick = (action: string) => {
    navigation.openTab([entity, action], 'rule');
  };

  return (
    <BaseMappingPane
      title={entity}
      description="Select an action or create a new one"
      navigation={navigation}
      className={className}
    >
      <div className="elb-mapping-entity-pane-body">
        {/* New action input */}
        <div className="elb-mapping-entity-pane-new-action">
          <MappingInputWithButton
            value={newActionName}
            onChange={handleActionInput}
            onSubmit={handleActionSubmit}
            onKeyDown={handleActionKeyDown}
            buttonLabel={actionExists ? 'Open' : 'Create'}
            showButton={true}
            placeholder="Type action name to create or select..."
            className={actionExists ? 'is-existing' : ''}
          />
        </div>

        {/* Existing actions list */}
        {actions.length > 0 && (
          <div className="elb-mapping-entity-pane-actions">
            <h3 className="elb-mapping-entity-pane-section-title">
              Existing Actions
            </h3>
            <div className="elb-mapping-entity-pane-action-list">
              {actions.map((action) => (
                <button
                  key={action}
                  type="button"
                  className="elb-mapping-entity-pane-action-button"
                  onClick={() => handleActionClick(action)}
                >
                  <span className="elb-mapping-entity-pane-action-name">
                    {action}
                  </span>
                  <span className="elb-mapping-entity-pane-action-arrow">
                    ›
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {actions.length === 0 && !newActionName && (
          <div className="elb-mapping-entity-pane-empty">
            <p>No actions yet. Type above to create the first action.</p>
          </div>
        )}
      </div>
    </BaseMappingPane>
  );
}
