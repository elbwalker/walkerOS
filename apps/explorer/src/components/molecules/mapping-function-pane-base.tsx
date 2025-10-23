import { useState, useEffect, type ReactNode } from 'react';
import type { MappingState } from '../../hooks/useMappingState';
import type { UseMappingNavigation } from '../../hooks/useMappingNavigation';
import { CodeBox } from '../organisms/code-box';
import { PaneHeader } from '../atoms/pane-header';
import { normalizeCode } from '../../utils/code-normalizer';

/**
 * Help Item - represents a single parameter, return value item, etc.
 */
export interface HelpItem {
  code: string; // The code snippet (e.g., "value", "true")
  description: string; // Human-readable description
}

/**
 * Help Example - code example with label
 */
export interface HelpExample {
  label: string; // Label describing the example
  code: string | ReactNode; // Example code (can contain JSX for HTML entities)
}

/**
 * Help Section - a titled section with either items or examples
 */
export interface HelpSection {
  title: string; // Section title (e.g., "Parameters", "Return Value")
  items?: HelpItem[]; // List items (for parameters, return values, etc.)
  examples?: HelpExample[]; // Code examples
}

/**
 * Base Props for Function Pane Component
 */
export interface MappingFunctionPaneBaseProps {
  title: string; // Pane title
  description: string; // Pane description
  defaultCode: string; // Default function code
  helpSections: HelpSection[]; // Array of help sections to display
  path: string[];
  mappingState: MappingState;
  navigation: UseMappingNavigation;
  className?: string;
}

/**
 * Mapping Function Pane Base
 *
 * Base component for function editing panes (condition, fn, validate).
 * Consolidates shared logic for state management, code editing, and help display.
 *
 * Used by:
 * - MappingConditionPaneView
 * - MappingFnPaneView
 * - MappingValidatePaneView
 */
export function MappingFunctionPaneBase({
  title,
  description,
  defaultCode,
  helpSections,
  path,
  mappingState,
  navigation,
  className = '',
}: MappingFunctionPaneBaseProps) {
  // Get current value from mapping state
  const value = mappingState.actions.getValue(path);
  const initialCode = typeof value === 'string' ? value : defaultCode;

  const [code, setCode] = useState(initialCode);

  // Update local state if external value changes
  useEffect(() => {
    const currentValue = mappingState.actions.getValue(path);
    const newCode =
      typeof currentValue === 'string' ? currentValue : defaultCode;
    setCode(newCode);
  }, [path, mappingState, defaultCode]);

  const handleCodeChange = (newCode: string) => {
    setCode(newCode);

    // Check if code is different from default (normalized comparison)
    const isDefault = normalizeCode(newCode) === normalizeCode(defaultCode);

    if (isDefault) {
      // Remove the property if it's the default
      mappingState.actions.deleteValue(path);
    } else {
      // Save the modified code
      mappingState.actions.setValue(path, newCode);
    }
  };

  const handleReset = () => {
    // Reset to default and remove from mapping
    setCode(defaultCode);
    mappingState.actions.deleteValue(path);
  };

  return (
    <div className={`elb-mapping-pane ${className}`}>
      <div className="elb-mapping-pane-content">
        <div className="elb-mapping-function-pane">
          {/* Header */}
          <PaneHeader
            title={title}
            description={description}
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
            {helpSections.map((section, sectionIndex) => (
              <div
                key={sectionIndex}
                className="elb-mapping-function-help-section"
              >
                <h4 className="elb-mapping-function-help-title">
                  {section.title}
                </h4>

                {/* Render items (parameters, return values, etc.) */}
                {section.items && section.items.length > 0 && (
                  <ul className="elb-mapping-function-help-list">
                    {section.items.map((item, itemIndex) => (
                      <li key={itemIndex}>
                        <code>{item.code}</code> - {item.description}
                      </li>
                    ))}
                  </ul>
                )}

                {/* Render examples */}
                {section.examples && section.examples.length > 0 && (
                  <div className="elb-mapping-function-examples">
                    {section.examples.map((example, exampleIndex) => (
                      <div
                        key={exampleIndex}
                        className="elb-mapping-function-example"
                      >
                        <div className="elb-mapping-function-example-label">
                          {example.label}
                        </div>
                        <code className="elb-mapping-function-example-code">
                          {example.code}
                        </code>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
