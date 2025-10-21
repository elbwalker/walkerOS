import React, { useState } from 'react';
import type { UseMappingState } from '../../hooks/useMappingState';

export interface MappingTransformationTabsProps {
  path: string[];
  mappingState: UseMappingState;
  className?: string;
}

type TransformationType = 'map' | 'loop' | 'fn' | 'set';

const TRANSFORMATION_TYPES: { type: TransformationType; label: string }[] = [
  { type: 'map', label: 'Map' },
  { type: 'loop', label: 'Loop' },
  { type: 'fn', label: 'Function' },
  { type: 'set', label: 'Set' },
];

/**
 * Transformation type tabs for rule properties (data, consent, etc.)
 * Shows tabs for map/loop/fn/set
 * Each tab shows the appropriate editor
 */
export function MappingTransformationTabs({
  path,
  mappingState,
  className = '',
}: MappingTransformationTabsProps) {
  const value = mappingState.actions.getValue(path);

  // Determine current type from value
  const getCurrentType = (): TransformationType => {
    if (!value || typeof value !== 'object') return 'map';
    if ('map' in value) return 'map';
    if ('loop' in value) return 'loop';
    if ('fn' in value) return 'fn';
    if ('set' in value) return 'set';
    return 'map';
  };

  const [selectedType, setSelectedType] =
    useState<TransformationType>(getCurrentType());

  const handleTypeChange = (type: TransformationType) => {
    setSelectedType(type);

    // Create appropriate empty structure when switching types
    switch (type) {
      case 'map':
        mappingState.actions.setValue(path, { map: {} });
        break;
      case 'loop':
        mappingState.actions.setValue(path, { loop: ['nested', {}] });
        break;
      case 'fn':
        mappingState.actions.setValue(path, { fn: '(event) => event.data' });
        break;
      case 'set':
        mappingState.actions.setValue(path, { set: [] });
        break;
    }
  };

  return (
    <div className={`elb-mapping-transformation-tabs ${className}`}>
      {/* Type tabs */}
      <div className="elb-mapping-key-tabs">
        {TRANSFORMATION_TYPES.map(({ type, label }) => (
          <button
            key={type}
            className={`elb-mapping-key-tab ${type === selectedType ? 'is-active' : ''}`}
            onClick={() => handleTypeChange(type)}
            type="button"
          >
            {label}
          </button>
        ))}
      </div>

      {/* Editor for selected type */}
      <div className="elb-mapping-transformation-editor">
        {selectedType === 'map' && (
          <div className="elb-mapping-transformation-content">
            <p>Map editor (keys will show as tabs here)</p>
            <p>Path: {path.join('.')}</p>
          </div>
        )}

        {selectedType === 'loop' && (
          <div className="elb-mapping-transformation-content">
            <p>Loop editor</p>
            <p>Source: nested</p>
          </div>
        )}

        {selectedType === 'fn' && (
          <div className="elb-mapping-transformation-content">
            <p>Function editor</p>
            <textarea
              value={
                typeof value === 'object' && value && 'fn' in value
                  ? String(value.fn)
                  : ''
              }
              onChange={(e) =>
                mappingState.actions.setValue(path, { fn: e.target.value })
              }
              rows={6}
              style={{ width: '100%', fontFamily: 'monospace', padding: '8px' }}
            />
          </div>
        )}

        {selectedType === 'set' && (
          <div className="elb-mapping-transformation-content">
            <p>Set editor (static array)</p>
          </div>
        )}
      </div>
    </div>
  );
}
