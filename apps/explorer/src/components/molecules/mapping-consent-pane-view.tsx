import { useState, useMemo } from 'react';
import type { UseMappingStateReturn } from '../../hooks/useMappingState';
import { ConsentStateTile } from '../atoms/consent-state-tile';
import { scanMappingForConsentStates } from '../../utils/consent-scanner';
import { PaneHeader } from '../atoms/pane-header';
import { getPathDescription } from '../../utils/path-analyzer';
import { MappingInputWithButton } from '../atoms/mapping-input-with-button';

/**
 * Mapping Consent Pane View
 *
 * Dedicated pane for configuring required consent states.
 * Shows discovered consent states as toggleable tiles plus input to add new ones.
 */
export interface MappingConsentPaneViewProps {
  path: string[];
  mappingState: UseMappingStateReturn;
  className?: string;
}

export function MappingConsentPaneView({
  path,
  mappingState,
  className = '',
}: MappingConsentPaneViewProps) {
  const [newStateName, setNewStateName] = useState('');

  // Get current consent value at this path
  const value = mappingState.actions.getValue(path);
  const currentConsent =
    value && typeof value === 'object'
      ? (value as Record<string, boolean>)
      : {};

  // Scan entire mapping for all consent states
  const discoveredStates = useMemo(
    () => scanMappingForConsentStates(mappingState.config),
    [mappingState.config],
  );

  const handleToggleState = (stateName: string) => {
    const isCurrentlyChecked = currentConsent[stateName] === true;

    if (isCurrentlyChecked) {
      // Uncheck: remove from consent object
      const newConsent = { ...currentConsent };
      delete newConsent[stateName];

      // If empty, delete the entire consent property
      if (Object.keys(newConsent).length === 0) {
        mappingState.actions.deleteValue(path);
      } else {
        mappingState.actions.setValue(path, newConsent);
      }
    } else {
      // Check: add to consent object with value true
      const newConsent = { ...currentConsent, [stateName]: true };
      mappingState.actions.setValue(path, newConsent);
    }
  };

  const handleInputChange = (value: string) => {
    setNewStateName(value);
  };

  const handleAddNewState = () => {
    const trimmed = newStateName.trim();
    if (!trimmed) return;

    // Don't add if it already exists
    if (discoveredStates.includes(trimmed)) {
      setNewStateName('');
      return;
    }

    // Add new state as checked
    const newConsent = { ...currentConsent, [trimmed]: true };
    mappingState.actions.setValue(path, newConsent);

    // Clear input
    setNewStateName('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      setNewStateName('');
    }
  };

  // Get context-aware title and description
  const { title, description } = useMemo(
    () => getPathDescription(path, mappingState.config),
    [path, mappingState.config],
  );

  return (
    <div className={`elb-mapping-pane ${className}`}>
      <div className="elb-mapping-pane-content">
        <div className="elb-mapping-consent-pane">
          <PaneHeader title={title} description={description} />

          {/* Consent State Tiles Grid */}
          <div className="elb-mapping-consent-grid">
            {discoveredStates.map((stateName) => (
              <ConsentStateTile
                key={stateName}
                label={stateName}
                checked={currentConsent[stateName] === true}
                onClick={() => handleToggleState(stateName)}
              />
            ))}

            {/* Add New State Input Tile - Always visible */}
            <div className="elb-mapping-consent-input-tile">
              <MappingInputWithButton
                value={newStateName}
                onChange={handleInputChange}
                onSubmit={handleAddNewState}
                onKeyDown={handleKeyDown}
                buttonLabel="Add"
                showButton={true}
                placeholder="Add new consent state"
                className="elb-mapping-consent-input-inner"
              />
            </div>
          </div>

          {/* Help Section */}
          <div className="elb-mapping-consent-help">
            <h4 className="elb-mapping-consent-help-title">How it works</h4>
            <ul className="elb-mapping-consent-help-list">
              <li>Checked states are required for processing</li>
              <li>Events queue until required consent is granted</li>
              <li>
                Consent states are discovered from your entire mapping
                configuration
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
