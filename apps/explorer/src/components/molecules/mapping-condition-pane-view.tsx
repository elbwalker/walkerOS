import { useState, useEffect } from 'react';
import type { MappingState } from '../../hooks/useMappingState';
import type { UseMappingNavigation } from '../../hooks/useMappingNavigation';
import { CodeBox } from '../organisms/code-box';
import { PaneHeader } from '../atoms/pane-header';
import { normalizeCode } from '../../utils/code-normalizer';

/**
 * Mapping Condition Pane View
 *
 * Dedicated pane for the 'condition' property - a function that determines
 * if the mapping rule should apply to an event.
 *
 * Returns true to apply the rule, false to skip it.
 */
export interface MappingConditionPaneViewProps {
  path: string[];
  mappingState: MappingState;
  navigation: UseMappingNavigation;
  className?: string;
}

const DEFAULT_CONDITION = `(value, mapping, collector) => {
  // Return true to apply this rule
  return true;
}`;

export function MappingConditionPaneView({
  path,
  mappingState,
  navigation,
  className = '',
}: MappingConditionPaneViewProps) {
  // Get current condition value
  const value = mappingState.actions.getValue(path);
  const initialCode = typeof value === 'string' ? value : DEFAULT_CONDITION;

  const [code, setCode] = useState(initialCode);

  // Update local state if external value changes
  useEffect(() => {
    const currentValue = mappingState.actions.getValue(path);
    const newCode =
      typeof currentValue === 'string' ? currentValue : DEFAULT_CONDITION;
    setCode(newCode);
  }, [path, mappingState]);

  const handleCodeChange = (newCode: string) => {
    setCode(newCode);

    // Check if code is different from default (normalized comparison)
    const isDefault =
      normalizeCode(newCode) === normalizeCode(DEFAULT_CONDITION);

    if (isDefault) {
      // Remove the condition property if it's the default
      mappingState.actions.deleteValue(path);
    } else {
      // Save the modified code
      mappingState.actions.setValue(path, newCode);
    }
  };

  const handleReset = () => {
    // Reset to default and remove from mapping
    setCode(DEFAULT_CONDITION);
    mappingState.actions.deleteValue(path);
  };

  return (
    <div className={`elb-mapping-pane ${className}`}>
      <div className="elb-mapping-pane-content">
        <div className="elb-mapping-function-pane">
          {/* Header */}
          <PaneHeader
            title="Condition Function"
            description="Define when this mapping rule should apply to an event"
            onBack={navigation.goBack}
            canGoBack={navigation.canGoBack()}
            action={{
              label: 'Reset',
              onClick: handleReset,
              title: 'Reset to default',
            }}
          />

          {/* Code Editor */}
          <div className="elb-mapping-function-editor">
            <CodeBox
              code={code}
              language="javascript"
              onChange={handleCodeChange}
              showHeader={false}
              label=""
            />
          </div>

          {/* Help Section */}
          <div className="elb-mapping-function-help">
            <div className="elb-mapping-function-help-section">
              <h4 className="elb-mapping-function-help-title">Parameters</h4>
              <ul className="elb-mapping-function-help-list">
                <li>
                  <code>value</code> - The event or current value being
                  processed
                </li>
                <li>
                  <code>mapping</code> - The mapping configuration
                </li>
                <li>
                  <code>collector</code> - The collector instance
                </li>
              </ul>
            </div>

            <div className="elb-mapping-function-help-section">
              <h4 className="elb-mapping-function-help-title">Return Value</h4>
              <ul className="elb-mapping-function-help-list">
                <li>
                  <code>true</code> - Apply this mapping rule
                </li>
                <li>
                  <code>false</code> - Skip this mapping rule
                </li>
              </ul>
            </div>

            <div className="elb-mapping-function-help-section">
              <h4 className="elb-mapping-function-help-title">Examples</h4>
              <div className="elb-mapping-function-examples">
                <div className="elb-mapping-function-example">
                  <div className="elb-mapping-function-example-label">
                    Only for high-value orders:
                  </div>
                  <code className="elb-mapping-function-example-code">
                    (value) =&gt; value.data?.total &gt; 100
                  </code>
                </div>
                <div className="elb-mapping-function-example">
                  <div className="elb-mapping-function-example-label">
                    Only for specific user segment:
                  </div>
                  <code className="elb-mapping-function-example-code">
                    (value) =&gt; value.user?.segment === 'premium'
                  </code>
                </div>
                <div className="elb-mapping-function-example">
                  <div className="elb-mapping-function-example-label">
                    Only during business hours:
                  </div>
                  <code className="elb-mapping-function-example-code">
                    () =&gt; new Date().getHours() &gt;= 9 && new
                    Date().getHours() &lt; 17
                  </code>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
