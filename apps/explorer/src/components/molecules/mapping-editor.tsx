import React, { useState, useMemo } from 'react';
import { AutoSelect } from './auto-select';
import { CodeBox } from '../organisms/code-box';

export interface MappingEditorProps {
  mapping: Record<string, Record<string, unknown>>;
  onMappingChange?: (mapping: Record<string, Record<string, unknown>>) => void;
}

/**
 * MappingEditor - Interactive mapping rule editor
 *
 * Features:
 * - AutoSelect dropdown to choose entity-action pairs
 * - Add button to create new rules
 * - CodeBox display of selected rule
 * - Converts mapping object to entity-action list
 *
 * Layout (within Box content):
 * Row 1: [AutoSelect] [+ Button]
 * Row 2: [CodeBox showing selected rule]
 *
 * @example
 * <MappingEditor
 *   mapping={{
 *     product: { view: { name: 'view_item' } },
 *     order: { complete: { name: 'purchase' } }
 *   }}
 * />
 */
export function MappingEditor({
  mapping,
  onMappingChange,
}: MappingEditorProps) {
  const [selectedRule, setSelectedRule] = useState('');

  // Convert mapping object to entity-action list
  const ruleOptions = useMemo(() => {
    const options: string[] = [];
    Object.keys(mapping).forEach((entity) => {
      const actions = mapping[entity];
      if (actions && typeof actions === 'object') {
        Object.keys(actions).forEach((action) => {
          options.push(`${entity} ${action}`);
        });
      }
    });
    return options.sort();
  }, [mapping]);

  // Get the rule configuration for the selected entity-action
  const selectedRuleConfig = useMemo(() => {
    if (!selectedRule) return null;

    const [entity, action] = selectedRule.split(' ');
    if (entity && action && mapping[entity]?.[action]) {
      return mapping[entity][action];
    }
    return null;
  }, [selectedRule, mapping]);

  const handleRuleSelect = (rule: string) => {
    setSelectedRule(rule);
  };

  const handleAddRule = () => {
    // Placeholder for add functionality
    console.log('Add new rule');
  };

  const selectedRuleJson = selectedRuleConfig
    ? JSON.stringify(selectedRuleConfig, null, 2)
    : '{}';

  return (
    <div className="elb-mapping-editor">
      <div className="elb-mapping-editor-controls">
        <AutoSelect
          options={ruleOptions}
          onSelect={handleRuleSelect}
          value={selectedRule}
          placeholder="Select mapping rule..."
        />
        <button
          className="elb-mapping-editor-add-btn"
          onClick={handleAddRule}
          title="Add new rule"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      </div>
      <div className="elb-mapping-editor-preview">
        <CodeBox
          code={selectedRuleJson}
          language="json"
          label={selectedRule || 'Rule Configuration'}
          disabled={!onMappingChange}
          autoHeight
          minHeight={150}
          maxHeight={400}
        />
      </div>
    </div>
  );
}
