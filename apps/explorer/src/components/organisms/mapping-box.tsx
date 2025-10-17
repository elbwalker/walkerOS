import React, { useState, useMemo } from 'react';
import { Box } from '../atoms/box';
import { ButtonGroup } from '../atoms/button-group';
import { CodeBox } from './code-box';
import { MappingEditor } from '../molecules/mapping-editor';

export interface MappingBoxProps {
  mapping: Record<string, Record<string, unknown>>;
  onMappingChange?: (mapping: Record<string, Record<string, unknown>>) => void;
  label?: string;
  className?: string;
  initialTab?: 'code' | 'visual';
}

/**
 * MappingBox - Mapping configuration viewer/editor with code/visual toggle
 *
 * Features:
 * - Toggle between Code and Visual views via ButtonGroup
 * - Code view: Display mapping JSON with CodeBox
 * - Visual view: Interactive mapping rule editor with AutoSelect
 * - Persists selected rule when switching between views
 * - Theme automatically handled by CSS variables
 *
 * @example
 * <MappingBox
 *   mapping={{
 *     product: { view: { name: 'view_item' } },
 *     order: { complete: { name: 'purchase' } }
 *   }}
 *   label="GA4 Mapping"
 * />
 *
 * @example
 * // Editable with onChange
 * <MappingBox
 *   mapping={mappingConfig}
 *   onMappingChange={setMappingConfig}
 *   label="Edit Mapping"
 * />
 */
export function MappingBox({
  mapping,
  onMappingChange,
  label = 'Mapping',
  className = '',
  initialTab = 'visual',
}: MappingBoxProps) {
  const [activeTab, setActiveTab] = useState<'code' | 'visual'>(initialTab);
  const [selectedRule, setSelectedRule] = useState('');

  // Convert mapping object to JSON string
  const mappingJson = useMemo(
    () => JSON.stringify(mapping, null, 2),
    [mapping],
  );

  // Build button group data
  const buttons = useMemo(
    () => [
      {
        label: 'Visual',
        value: 'visual',
        active: activeTab === 'visual',
      },
      {
        label: 'Code',
        value: 'code',
        active: activeTab === 'code',
      },
    ],
    [activeTab],
  );

  const handleTabChange = (tab: string) => {
    setActiveTab(tab as 'code' | 'visual');
  };

  const handleMappingJsonChange = (json: string) => {
    if (!onMappingChange) return;

    try {
      const parsed = JSON.parse(json);
      onMappingChange(parsed);
    } catch (e) {
      // Invalid JSON, don't update
    }
  };

  return (
    <Box
      header={label}
      headerActions={
        <ButtonGroup buttons={buttons} onButtonClick={handleTabChange} />
      }
      className={className}
    >
      {activeTab === 'code' ? (
        <CodeBox
          code={mappingJson}
          language="json"
          label={label}
          onChange={onMappingChange ? handleMappingJsonChange : undefined}
          showFormat={!!onMappingChange}
        />
      ) : (
        <MappingEditor
          mapping={mapping}
          onMappingChange={onMappingChange}
          selectedRule={selectedRule}
          onSelectedRuleChange={setSelectedRule}
        />
      )}
    </Box>
  );
}
