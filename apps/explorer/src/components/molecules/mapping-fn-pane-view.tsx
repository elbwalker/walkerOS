import { useState, useEffect } from 'react';
import type { MappingState } from '../../hooks/useMappingState';
import type { UseMappingNavigation } from '../../hooks/useMappingNavigation';
import { CodeBox } from '../organisms/code-box';
import { PaneHeader } from '../atoms/pane-header';
import { normalizeCode } from '../../utils/code-normalizer';

/**
 * Mapping Fn Pane View
 *
 * Dedicated pane for the 'fn' property - a transformation function that
 * processes event data and returns a transformed value.
 *
 * Function signature: (value, mapping, options) => any
 */
export interface MappingFnPaneViewProps {
  path: string[];
  mappingState: MappingState;
  navigation: UseMappingNavigation;
  className?: string;
}

const DEFAULT_FN = `(value, mapping, options) => {
  // Transform and return the value
  // Access event data: value.data, value.user, value.globals
  // Access collector: options.collector
  return value.data;
}`;

export function MappingFnPaneView({
  path,
  mappingState,
  navigation,
  className = '',
}: MappingFnPaneViewProps) {
  // Get current fn value
  const value = mappingState.actions.getValue(path);
  const initialCode = typeof value === 'string' ? value : DEFAULT_FN;

  const [code, setCode] = useState(initialCode);

  // Update local state if external value changes
  useEffect(() => {
    const currentValue = mappingState.actions.getValue(path);
    const newCode =
      typeof currentValue === 'string' ? currentValue : DEFAULT_FN;
    setCode(newCode);
  }, [path, mappingState]);

  const handleCodeChange = (newCode: string) => {
    setCode(newCode);

    // Check if code is different from default (normalized comparison)
    const isDefault = normalizeCode(newCode) === normalizeCode(DEFAULT_FN);

    if (isDefault) {
      // Remove the fn property if it's the default
      mappingState.actions.deleteValue(path);
    } else {
      // Save the modified code
      mappingState.actions.setValue(path, newCode);
    }
  };

  const handleReset = () => {
    // Reset to default and remove from mapping
    setCode(DEFAULT_FN);
    mappingState.actions.deleteValue(path);
  };

  return (
    <div className={`elb-mapping-pane ${className}`}>
      <div className="elb-mapping-pane-content">
        <div className="elb-mapping-function-pane">
          {/* Header */}
          <PaneHeader
            title="Transformation Function"
            description="Transform event data before sending to destination"
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
                  <code>mapping</code> - The mapping configuration for this
                  property
                </li>
                <li>
                  <code>options</code> - Additional options
                  <ul>
                    <li>
                      <code>options.collector</code> - The collector instance
                    </li>
                    <li>
                      <code>options.consent</code> - Current consent states
                    </li>
                    <li>
                      <code>options.props</code> - Custom properties
                    </li>
                  </ul>
                </li>
              </ul>
            </div>

            <div className="elb-mapping-function-help-section">
              <h4 className="elb-mapping-function-help-title">Return Value</h4>
              <ul className="elb-mapping-function-help-list">
                <li>
                  Return the transformed value (string, number, object, array)
                </li>
                <li>
                  Return <code>undefined</code> to skip this property
                </li>
                <li>Can be async (return Promise)</li>
              </ul>
            </div>

            <div className="elb-mapping-function-help-section">
              <h4 className="elb-mapping-function-help-title">Examples</h4>
              <div className="elb-mapping-function-examples">
                <div className="elb-mapping-function-example">
                  <div className="elb-mapping-function-example-label">
                    Extract nested property:
                  </div>
                  <code className="elb-mapping-function-example-code">
                    (value) =&gt; value.data?.product?.id
                  </code>
                </div>
                <div className="elb-mapping-function-example">
                  <div className="elb-mapping-function-example-label">
                    Format currency:
                  </div>
                  <code className="elb-mapping-function-example-code">
                    (value) =&gt; &#123;{'\n'}
                    {'  '}const price = value.data?.price || 0;{'\n'}
                    {'  '}return price.toFixed(2);{'\n'}
                    &#125;
                  </code>
                </div>
                <div className="elb-mapping-function-example">
                  <div className="elb-mapping-function-example-label">
                    Combine multiple fields:
                  </div>
                  <code className="elb-mapping-function-example-code">
                    (value) =&gt; `$&#123;value.data?.firstName&#125;
                    $&#123;value.data?.lastName&#125;`
                  </code>
                </div>
                <div className="elb-mapping-function-example">
                  <div className="elb-mapping-function-example-label">
                    Conditional transformation with consent:
                  </div>
                  <code className="elb-mapping-function-example-code">
                    (value, mapping, options) =&gt; &#123;{'\n'}
                    {'  '}if (options.consent?.marketing) &#123;{'\n'}
                    {'    '}return value.user?.email;{'\n'}
                    {'  '}&#125;{'\n'}
                    {'  '}return undefined;{'\n'}
                    &#125;
                  </code>
                </div>
                <div className="elb-mapping-function-example">
                  <div className="elb-mapping-function-example-label">
                    Use collector for context:
                  </div>
                  <code className="elb-mapping-function-example-code">
                    (value, mapping, options) =&gt; &#123;{'\n'}
                    {'  '}const sessionId = options.collector?.session?.id;
                    {'\n'}
                    {'  '}return &#123;{'\n'}
                    {'    '}eventId: value.id,{'\n'}
                    {'    '}sessionId: sessionId,{'\n'}
                    {'  '}&#125;;{'\n'}
                    &#125;
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
