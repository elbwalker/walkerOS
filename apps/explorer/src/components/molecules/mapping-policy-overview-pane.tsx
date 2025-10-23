import { useState } from 'react';
import type { UseMappingStateReturn } from '../../hooks/useMappingState';
import type { UseMappingNavigationReturn } from '../../hooks/useMappingNavigation';
import { BaseMappingPane } from '../atoms/base-mapping-pane';
import { MappingInput } from '../atoms/mapping-input';
import { MappingConfirmButton } from '../atoms/mapping-confirm-button';
import { getConfiguredProperties } from '../../utils/value-display-formatter';

/**
 * Policy Overview Pane
 *
 * Shows all policy rules as a list with badges for configured properties.
 * Policy rules are pre-processing transformations that modify events before mapping.
 *
 * Can be used for:
 * - Config-level policy: path = ['policy']
 * - Event-level policy: path = ['entity', 'action', 'policy']
 *
 * Each rule:
 * - Path: The dot-notation key in the event (e.g., 'user.email', 'data.price')
 * - Value: A Value mapping (key, fn, map, loop, etc.)
 * - Badges: Show which properties are configured (fn, consent, condition, etc.)
 * - Actions: Delete
 */
export interface MappingPolicyOverviewPaneProps {
  path?: string[];
  mappingState: UseMappingStateReturn;
  navigation: UseMappingNavigationReturn;
  className?: string;
}

export function MappingPolicyOverviewPane({
  path = ['policy'],
  mappingState,
  navigation,
  className = '',
}: MappingPolicyOverviewPaneProps) {
  const [newPolicyPath, setNewPolicyPath] = useState('');
  const [pathExists, setPathExists] = useState(false);

  // Get policy from the current path
  const policyValue = mappingState.actions.getValue(path);
  const policy =
    policyValue &&
    typeof policyValue === 'object' &&
    !Array.isArray(policyValue)
      ? (policyValue as Record<string, unknown>)
      : {};

  // Get sorted list of policy paths
  const policyPaths = Object.keys(policy).sort();

  const handlePathInputChange = (value: string) => {
    setNewPolicyPath(value);
    setPathExists(policy[value] !== undefined);
  };

  const handlePathSubmit = () => {
    const policyPath = newPolicyPath.trim();
    if (!policyPath) {
      setNewPolicyPath('');
      return;
    }

    // Navigate to the policy rule (creates path in navigation)
    // Don't pre-populate value - let user configure it
    navigation.openTab([...path, policyPath], 'valueType');

    setNewPolicyPath('');
    setPathExists(false);
  };

  const handlePathKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handlePathSubmit();
    } else if (e.key === 'Escape') {
      setNewPolicyPath('');
      setPathExists(false);
    }
  };

  const handlePathBlur = () => {
    setTimeout(() => {
      handlePathSubmit();
    }, 150);
  };

  const handlePathClick = (policyPath: string) => {
    navigation.openTab([...path, policyPath], 'valueType');
  };

  const handleBadgeClick = (policyPath: string, property: string) => {
    // All badges navigate to the ValueType pane which shows all tiles
    // User can click the appropriate tile there
    navigation.openTab([...path, policyPath], 'valueType');
  };

  const handleDeleteClick = (policyPath: string) => {
    mappingState.actions.deleteValue([...path, policyPath]);
  };

  // Determine which properties are configured for a policy value
  return (
    <BaseMappingPane
      title="Policy"
      description={
        policyPaths.length === 0
          ? 'No policy rules yet. Add rules to pre-process events before mapping.'
          : `${policyPaths.length} rule${policyPaths.length === 1 ? '' : 's'}`
      }
      navigation={navigation}
      className={className}
    >
      {/* Add new policy rule input */}
      <div className="elb-policy-input-section">
        <MappingInput
          value={newPolicyPath}
          onChange={handlePathInputChange}
          onKeyDown={handlePathKeyDown}
          onBlur={handlePathBlur}
          placeholder="Type path to create or select (e.g., user.email)..."
          className={pathExists ? 'is-existing' : ''}
        />
      </div>

      {/* Policy rules list */}
      {policyPaths.length > 0 && (
        <div className="elb-policy-list">
          {policyPaths.map((path) => {
            const value = policy[path];
            const configuredProps = getConfiguredProperties(value);

            return (
              <div key={path} className="elb-policy-row">
                {/* Path */}
                <button
                  type="button"
                  className="elb-policy-row-path"
                  onClick={() => handlePathClick(path)}
                  title="Click to edit this policy rule"
                >
                  {path}
                </button>

                {/* Badges */}
                <div className="elb-policy-row-badges">
                  {configuredProps.map(({ prop, value, isLong }) => (
                    <button
                      key={prop}
                      type="button"
                      className="elb-policy-badge"
                      onClick={() => handleBadgeClick(path, prop)}
                      title={`${prop}: ${value}`}
                    >
                      <span className="elb-policy-badge-label">{prop}:</span>
                      <span
                        className={`elb-policy-badge-value ${isLong ? 'is-long' : ''}`}
                      >
                        {value}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Actions */}
                <div className="elb-policy-row-actions">
                  <MappingConfirmButton
                    confirmLabel="Delete?"
                    onConfirm={() => handleDeleteClick(path)}
                    ariaLabel={`Delete policy rule ${path}`}
                    className="elb-mapping-delete-button"
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty state */}
      {policyPaths.length === 0 && (
        <div className="elb-policy-empty">
          <p>
            Policy rules modify events before mapping is applied. Common uses:
          </p>
          <ul>
            <li>Normalize data (e.g., lowercase emails)</li>
            <li>Enrich events (e.g., copy values, compute totals)</li>
            <li>Clean data (e.g., remove PII, format dates)</li>
          </ul>
        </div>
      )}
    </BaseMappingPane>
  );
}
