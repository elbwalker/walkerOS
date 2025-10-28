import { useState, useMemo } from 'react';
import { Box } from '../../atoms/box';
import { ButtonGroup } from '../../atoms/button-group';
import { CodeBox } from '../code-box';
import { ConfigEditorTabs, type NavigationState } from './config-editor-tabs';
import type { ConfigStructureDef } from '../../../schemas/config-structures/types';
import type { RJSFSchema } from '@rjsf/utils';

/**
 * Config Editor Box
 *
 * Wrapper component that provides Code/Visual toggle.
 * Persists navigation state when switching between views.
 *
 * @example
 * <ConfigEditorBox
 *   config={destinationConfig}
 *   onChange={setConfig}
 *   structure={DESTINATION_CONFIG_STRUCTURE}
 *   schemas={metaSchemas}
 *   label="Meta Pixel Configuration"
 * />
 */
export interface ConfigEditorBoxProps<T extends Record<string, unknown>> {
  config: T;
  onChange?: (config: T) => void;
  structure: ConfigStructureDef;
  schemas?: Record<string, RJSFSchema>;
  sections?: Record<string, boolean>;
  label?: string;
  className?: string;
  initialTab?: 'code' | 'visual';
  resizable?: boolean;
  showTree?: boolean;
  showHeader?: boolean;
  initialNavigationState?: NavigationState;
  onNavigationStateChange?: (state: NavigationState) => void;
}

export function ConfigEditorBox<T extends Record<string, unknown>>({
  config,
  onChange,
  structure,
  schemas,
  sections,
  label = 'Configuration',
  className = '',
  initialTab = 'visual',
  resizable = false,
  showTree = true,
  showHeader = true,
  initialNavigationState,
  onNavigationStateChange,
}: ConfigEditorBoxProps<T>) {
  const [activeTab, setActiveTab] = useState<'code' | 'visual'>(initialTab);

  // Persist navigation state across view switches
  const [persistedNavigationState, setPersistedNavigationState] =
    useState<NavigationState | null>(initialNavigationState || null);

  // Convert config to JSON string
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

  // Handle code changes
  const handleCodeChange = (newCode: string) => {
    if (!onChange) return;

    try {
      const newConfig = JSON.parse(newCode);
      onChange(newConfig);
    } catch (e) {
      // Invalid JSON - ignore
      console.warn('Invalid JSON:', e);
    }
  };

  // Handle navigation state persistence
  const handleNavigationChange = (state: NavigationState) => {
    setPersistedNavigationState(state);
    onNavigationStateChange?.(state);
  };

  return (
    <Box
      header={label}
      headerActions={
        showHeader ? (
          <ButtonGroup buttons={buttons} onButtonClick={handleTabChange} />
        ) : undefined
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
          disabled={!onChange}
          onChange={onChange ? handleCodeChange : undefined}
        />
      ) : (
        <ConfigEditorTabs
          config={config}
          onChange={onChange}
          structure={structure}
          schemas={schemas}
          sections={sections}
          showTree={showTree}
          initialNavigationState={persistedNavigationState || undefined}
          onNavigationStateChange={handleNavigationChange}
        />
      )}
    </Box>
  );
}
