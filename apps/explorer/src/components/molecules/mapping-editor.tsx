import React, { useState, useMemo } from 'react';
import { AutoSelect } from './auto-select';
import { CodeBox } from '../organisms/code-box';
import { IconButton } from '../atoms/icon-button';

export interface MappingEditorProps {
  mapping: Record<string, Record<string, unknown>>;
  onMappingChange?: (mapping: Record<string, Record<string, unknown>>) => void;
}

/**
 * MappingEditor - Interactive mapping rule editor
 *
 * Features:
 * - AutoSelect dropdown to choose entity-action pairs
 * - CodeBox display of selected rule with editing capability
 * - Delete and Save action buttons (only visible when rule selected)
 * - Create new rules via dropdown (create) option
 * - Placeholder when no rule selected
 *
 * @example
 * <MappingEditor
 *   mapping={{
 *     product: { view: { name: 'view_item' } },
 *     order: { complete: { name: 'purchase' } }
 *   }}
 *   onMappingChange={setMapping}
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

  const createNewRule = (ruleName: string) => {
    if (!onMappingChange || !ruleName.trim()) return;

    const [entity, action] = ruleName.trim().split(' ');
    if (!entity || !action) {
      console.warn('Invalid rule name format. Expected "entity action"');
      return;
    }

    // Create new rule with default configuration
    const newMapping = { ...mapping };
    if (!newMapping[entity]) {
      newMapping[entity] = {};
    }

    // Only create if it doesn't exist
    if (!newMapping[entity][action]) {
      newMapping[entity][action] = {
        name: `${entity}_${action}`,
      };
      onMappingChange(newMapping);
      setSelectedRule(ruleName.trim());
    }
  };

  const handleRuleSelect = (rule: string, isNew?: boolean) => {
    if (isNew) {
      createNewRule(rule);
    } else {
      setSelectedRule(rule);
    }
  };

  const handleDelete = () => {
    if (!onMappingChange || !selectedRule) return;

    const [entity, action] = selectedRule.split(' ');
    if (!entity || !action) return;

    const newMapping = { ...mapping };
    if (newMapping[entity]?.[action]) {
      delete newMapping[entity][action];

      // Remove entity if no actions left
      if (Object.keys(newMapping[entity]).length === 0) {
        delete newMapping[entity];
      }

      onMappingChange(newMapping);
      setSelectedRule('');
    }
  };

  const handleSave = () => {
    if (!onMappingChange) return;
    // Placeholder for future save functionality
    console.log('Save mapping', mapping);
  };

  const selectedRuleJson = selectedRuleConfig
    ? JSON.stringify(selectedRuleConfig, null, 2)
    : '{}';

  return (
    <div className="elb-mapping-editor">
      <div className="elb-mapping-editor-select">
        <AutoSelect
          options={ruleOptions}
          onSelect={handleRuleSelect}
          value={selectedRule}
          placeholder="Select mapping rule..."
        />
      </div>

      {selectedRuleConfig ? (
        <>
          <div className="elb-mapping-editor-content">
            <CodeBox
              code={selectedRuleJson}
              language="json"
              label={selectedRule}
              onChange={onMappingChange ? undefined : undefined}
              showFormat={false}
              autoHeight
              minHeight={150}
              maxHeight={400}
            />
          </div>
          <div className="elb-mapping-editor-actions">
            <IconButton
              icon="delete"
              variant="danger"
              onClick={handleDelete}
              disabled={!onMappingChange}
              title="Delete rule"
            >
              Delete
            </IconButton>
            <IconButton
              icon="save"
              variant="primary"
              onClick={handleSave}
              disabled={!onMappingChange}
              title="Save mapping"
            >
              Save
            </IconButton>
          </div>
        </>
      ) : (
        <div className="elb-mapping-editor-placeholder">
          Add or select mapping rule
        </div>
      )}
    </div>
  );
}
