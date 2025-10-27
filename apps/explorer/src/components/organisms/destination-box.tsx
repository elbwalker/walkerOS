import React, { useState, useMemo } from 'react';
import { Box } from '../atoms/box';
import { ButtonGroup } from '../atoms/button-group';
import { CodeBox } from './code-box';
import { DestinationEditorTabs } from './destination-editor-tabs';
import type { NodeType } from '../../hooks/useMappingNavigation';
import type { RJSFSchema, UiSchema } from '@rjsf/utils';
import type { Destination } from '@walkeros/core';

/**
 * Destination schema bundle for runtime provision
 *
 * Maps to Destination.Types<S, M, E> generic structure:
 * - settings: JSON Schema for config-level Settings<T>
 * - mapping: JSON Schema for rule-level Mapping<T> (settings inside rules)
 * - data: JSON Schema for expected event data properties
 */
export interface DestinationSchemas {
  /** Config-level settings schema (for Settings<T>) */
  settings?: RJSFSchema;
  /** Config-level settings UI schema */
  settingsUi?: UiSchema;
  /** Rule-level mapping settings schema (for Mapping<T>) */
  mapping?: RJSFSchema;
  /** Rule-level mapping settings UI schema */
  mappingUi?: UiSchema;
  /** Expected data properties schema for destination events */
  data?: RJSFSchema;
  /** Data properties UI schema */
  dataUi?: UiSchema;
}

/**
 * Destination configuration type alias
 *
 * Uses Destination.Config<T> from @walkeros/core.
 * For untyped/dynamic usage, defaults to unknown generics.
 * For typed usage, pass proper Destination.Types<Settings, Mapping, Env>.
 */
export type DestinationConfig<
  T extends Destination.TypesGeneric = Destination.Types,
> = Destination.Config<T>;

/**
 * Which sections of the config should be editable
 */
export interface DestinationBoxSections {
  settings?: boolean;
  mapping?: boolean;
  data?: boolean;
  policy?: boolean;
  consent?: boolean;
  id?: boolean;
  loadScript?: boolean;
  queue?: boolean;
  verbose?: boolean;
}

export interface DestinationBoxProps<
  T extends Destination.TypesGeneric = Destination.Types,
> {
  config: DestinationConfig<T>;
  onConfigChange?: (config: DestinationConfig<T>) => void;
  label?: string;
  className?: string;
  initialTab?: 'code' | 'visual';
  resizable?: boolean;
  showTree?: boolean;
  showHeader?: boolean;
  schemas?: DestinationSchemas;
  sections?: DestinationBoxSections;
}

/**
 * DestinationBox - Complete destination configuration viewer/editor
 *
 * Extends MappingBox pattern to support full Destination.Config editing:
 * - settings: Destination-specific configuration
 * - mapping: Event-specific mapping rules
 * - data: Global data transformations
 * - policy: Processing policy rules
 * - consent: Consent requirements
 * - options: loadScript, queue, verbose, etc.
 *
 * Features:
 * - Toggle between Code and Visual views
 * - Tree navigation for config sections
 * - Schema-driven property suggestions
 * - Path-based editing with tabs
 * - Reuses MappingBox infrastructure
 *
 * @example
 * <DestinationBox
 *   config={{
 *     settings: { pixelId: '123' },
 *     mapping: { product: { view: { name: 'ViewContent' } } }
 *   }}
 *   onConfigChange={setConfig}
 *   schemas={{ settings: settingsSchema, mapping: mappingSchema }}
 * />
 */
export function DestinationBox<
  T extends Destination.TypesGeneric = Destination.Types,
>({
  config,
  onConfigChange,
  label = 'Destination Config',
  className = '',
  initialTab = 'visual',
  resizable = false,
  showTree = true,
  showHeader = true,
  schemas,
  sections = {},
}: DestinationBoxProps<T>) {
  const [activeTab, setActiveTab] = useState<'code' | 'visual'>(initialTab);

  // Persist navigation state across view switches
  const [persistedNavigationState, setPersistedNavigationState] = useState<{
    currentPath: string[];
    nodeType: NodeType;
    expandedPaths: string[][];
  } | null>(null);

  // Convert config object to JSON string
  const configJson = useMemo(() => JSON.stringify(config, null, 2), [config]);

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

  // Handle tab change
  const handleTabChange = (value: string) => {
    setActiveTab(value as 'code' | 'visual');
  };

  // Handle navigation state persistence
  const handleNavigationChange = (state: {
    currentPath: string[];
    nodeType: NodeType;
    expandedPaths: string[][];
  }) => {
    setPersistedNavigationState(state);
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
          code={configJson}
          language="json"
          label={label}
          disabled={!onConfigChange}
          onChange={(newCode) => {
            if (onConfigChange) {
              try {
                const newConfig = JSON.parse(newCode);
                onConfigChange(newConfig);
              } catch (e) {
                // Invalid JSON - ignore
                console.warn('Invalid JSON:', e);
              }
            }
          }}
        />
      ) : (
        <DestinationEditorTabs
          initialConfig={config}
          onChange={onConfigChange}
          showTree={showTree}
          initialNavigationState={persistedNavigationState || undefined}
          onNavigationStateChange={handleNavigationChange}
          schemas={schemas}
          sections={sections}
        />
      )}
    </Box>
  );
}
