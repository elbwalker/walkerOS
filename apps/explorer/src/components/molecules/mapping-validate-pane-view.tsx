import { useState, useEffect } from 'react';
import type { MappingState } from '../../hooks/useMappingState';
import { CodeBox } from '../organisms/code-box';
import { PaneHeader } from '../atoms/pane-header';
import { normalizeCode } from '../../utils/code-normalizer';

/**
 * Mapping Validate Pane View
 *
 * Dedicated pane for the 'validate' property - a validation function that
 * checks if a transformed value should be included.
 *
 * Function signature: (value?) => boolean
 * Returns true to include the value, false to exclude it.
 */
export interface MappingValidatePaneViewProps {
  path: string[];
  mappingState: MappingState;
  className?: string;
}

const DEFAULT_VALIDATE = `(value) => {
  // Return true to include this value
  // Return false to exclude it
  return value !== undefined && value !== null && value !== '';
}`;

export function MappingValidatePaneView({
  path,
  mappingState,
  className = '',
}: MappingValidatePaneViewProps) {
  // Get current validate value
  const value = mappingState.actions.getValue(path);
  const initialCode = typeof value === 'string' ? value : DEFAULT_VALIDATE;

  const [code, setCode] = useState(initialCode);

  // Update local state if external value changes
  useEffect(() => {
    const currentValue = mappingState.actions.getValue(path);
    const newCode =
      typeof currentValue === 'string' ? currentValue : DEFAULT_VALIDATE;
    setCode(newCode);
  }, [path, mappingState]);

  const handleCodeChange = (newCode: string) => {
    setCode(newCode);

    // Check if code is different from default (normalized comparison)
    const isDefault =
      normalizeCode(newCode) === normalizeCode(DEFAULT_VALIDATE);

    if (isDefault) {
      // Remove the validate property if it's the default
      mappingState.actions.deleteValue(path);
    } else {
      // Save the modified code
      mappingState.actions.setValue(path, newCode);
    }
  };

  const handleReset = () => {
    // Reset to default and remove from mapping
    setCode(DEFAULT_VALIDATE);
    mappingState.actions.deleteValue(path);
  };

  return (
    <div className={`elb-mapping-pane ${className}`}>
      <div className="elb-mapping-pane-content">
        <div className="elb-mapping-function-pane">
          {/* Header */}
          <PaneHeader
            title="Validation Function"
            description="Validate if the transformed value should be included"
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
              <h4 className="elb-mapping-function-help-title">Parameter</h4>
              <ul className="elb-mapping-function-help-list">
                <li>
                  <code>value</code> - The transformed value to validate
                  (optional)
                </li>
              </ul>
            </div>

            <div className="elb-mapping-function-help-section">
              <h4 className="elb-mapping-function-help-title">Return Value</h4>
              <ul className="elb-mapping-function-help-list">
                <li>
                  <code>true</code> - Include this value in the result
                </li>
                <li>
                  <code>false</code> - Exclude this value (skip it)
                </li>
                <li>Can be async (return Promise)</li>
              </ul>
            </div>

            <div className="elb-mapping-function-help-section">
              <h4 className="elb-mapping-function-help-title">Examples</h4>
              <div className="elb-mapping-function-examples">
                <div className="elb-mapping-function-example">
                  <div className="elb-mapping-function-example-label">
                    Exclude empty values:
                  </div>
                  <code className="elb-mapping-function-example-code">
                    (value) =&gt; value !== undefined && value !== null && value
                    !== ''
                  </code>
                </div>
                <div className="elb-mapping-function-example">
                  <div className="elb-mapping-function-example-label">
                    Only include valid email addresses:
                  </div>
                  <code className="elb-mapping-function-example-code">
                    (value) =&gt; typeof value === 'string' &&
                    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
                  </code>
                </div>
                <div className="elb-mapping-function-example">
                  <div className="elb-mapping-function-example-label">
                    Only include positive numbers:
                  </div>
                  <code className="elb-mapping-function-example-code">
                    (value) =&gt; typeof value === 'number' && value &gt; 0
                  </code>
                </div>
                <div className="elb-mapping-function-example">
                  <div className="elb-mapping-function-example-label">
                    Validate URL format:
                  </div>
                  <code className="elb-mapping-function-example-code">
                    (value) =&gt; &#123;{'\n'}
                    {'  '}try &#123;{'\n'}
                    {'    '}new URL(value);{'\n'}
                    {'    '}return true;{'\n'}
                    {'  '}&#125; catch &#123;{'\n'}
                    {'    '}return false;{'\n'}
                    {'  '}&#125;{'\n'}
                    &#125;
                  </code>
                </div>
                <div className="elb-mapping-function-example">
                  <div className="elb-mapping-function-example-label">
                    Exclude specific values:
                  </div>
                  <code className="elb-mapping-function-example-code">
                    (value) =&gt; !['test', 'localhost',
                    'example.com'].includes(value)
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
