import React, { useState, useMemo } from 'react';
import { Box } from '../atoms/box';
import { ButtonGroup } from '../atoms/button-group';
import { CodeBox } from './code-box';
import { MappingEditorTabs } from './mapping-editor-tabs';
import type { NodeType } from '../../hooks/useMappingNavigation';
import type { Mapping } from '@walkeros/core';
import type { RJSFSchema, UiSchema } from '@rjsf/utils';

/**
 * Destination schema bundle for runtime provision
 */
export interface DestinationSchemas {
  /** Config-level settings schema (not used in mapping editor) */
  settings?: RJSFSchema;
  /** Config-level settings UI schema */
  settingsUi?: UiSchema;
  /** Rule-level mapping settings schema */
  mapping?: RJSFSchema;
  /** Rule-level mapping settings UI schema */
  mappingUi?: UiSchema;
}

export interface MappingBoxProps {
  mapping: Record<string, Record<string, unknown>>;
  onMappingChange?: (mapping: Record<string, Record<string, unknown>>) => void;
  label?: string;
  className?: string;
  initialTab?: 'code' | 'visual';
  resizable?: boolean;
  showTree?: boolean; // Show tree sidebar in visual editor (default: true)
  showHeader?: boolean; // Show box header with code/visual toggle (default: true)
  /** Destination schemas for type-aware editing (Phase 1: Settings implementation) */
  schemas?: DestinationSchemas;
}

/**
 * MappingBox - Mapping configuration viewer/editor with code/visual toggle
 *
 * Features:
 * - Toggle between Code and Visual views via ButtonGroup
 * - Code view: Display mapping JSON with CodeBox
 * - Visual view: Interactive tab-based editor with tree sidebar
 * - Persists navigation state when switching between views
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
 * // Editable with schemas
 * <MappingBox
 *   mapping={mappingConfig}
 *   onMappingChange={setMappingConfig}
 *   label="Edit Mapping"
 *   schemas={{ mapping: schema, mappingUi: uiSchema }}
 * />
 */
export function MappingBox({
  mapping,
  onMappingChange,
  label = 'Mapping',
  className = '',
  initialTab = 'visual',
  resizable = false,
  showTree = true,
  showHeader = true,
  schemas,
}: MappingBoxProps) {
  const [activeTab, setActiveTab] = useState<'code' | 'visual'>(initialTab);

  // Persist navigation state across view switches
  const [persistedNavigationState, setPersistedNavigationState] = useState<{
    currentPath: string[];
    nodeType: NodeType;
    expandedPaths: string[][];
  } | null>(null);

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
      resizable={resizable}
      showHeader={showHeader}
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
        <MappingEditorTabs
          initialMapping={mapping as Mapping.Config}
          onChange={
            onMappingChange as ((config: Mapping.Config) => void) | undefined
          }
          layout="responsive"
          showTree={showTree}
          initialNavigationState={persistedNavigationState || undefined}
          onNavigationStateChange={setPersistedNavigationState}
          schemas={schemas}
        />
      )}
    </Box>
  );
}
