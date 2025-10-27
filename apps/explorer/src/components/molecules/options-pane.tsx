import type { UseMappingStateReturn } from '../../hooks/useMappingState';
import type { UseMappingNavigationReturn } from '../../hooks/useMappingNavigation';
import { BaseMappingPane } from '../atoms/base-mapping-pane';
import { MappingFormWrapper } from '../forms/mapping-form-wrapper';
import type { RJSFSchema, UiSchema } from '@rjsf/utils';

/**
 * Options Pane - Edit root-level destination config options
 *
 * Handles config properties like:
 * - id: Destination ID
 * - loadScript: Whether to auto-load external scripts
 * - queue: Enable event queuing
 * - verbose: Enable verbose logging
 *
 * Uses RJSF for form generation with toggle switches and inputs.
 *
 * @example
 * <OptionsPane
 *   path={['options']}
 *   mappingState={configState}
 *   navigation={navigation}
 * />
 */
export interface OptionsPaneProps {
  path: string[];
  mappingState: UseMappingStateReturn;
  navigation: UseMappingNavigationReturn;
  className?: string;
}

export function OptionsPane({
  path,
  mappingState,
  navigation,
  className = '',
}: OptionsPaneProps) {
  // Get root config (path is ['options'], but we need root values)
  const rootConfig = mappingState.config as Record<string, unknown>;

  const currentOptions = {
    id: rootConfig.id,
    loadScript: rootConfig.loadScript,
    queue: rootConfig.queue,
    verbose: rootConfig.verbose,
  };

  // Schema for options
  const schema: RJSFSchema = {
    type: 'object',
    title: 'Options',
    properties: {
      id: {
        type: 'string',
        title: 'Destination ID',
        description: 'Unique identifier for this destination instance',
      },
      loadScript: {
        type: 'boolean',
        title: 'Load Script',
        description: 'Automatically load required external scripts',
      },
      queue: {
        type: 'boolean',
        title: 'Enable Queue',
        description: 'Queue events when destination is not ready',
      },
      verbose: {
        type: 'boolean',
        title: 'Verbose Logging',
        description: 'Enable detailed console logging for debugging',
      },
    },
  };

  const uiSchema: UiSchema = {
    id: {
      'ui:placeholder': 'e.g., meta-pixel, ga4-analytics',
      'ui:help': 'Optional identifier for logging and debugging',
    },
    loadScript: {
      'ui:widget': 'MappingBooleanWidget',
      'ui:help':
        'When enabled, the destination will load its tracking script automatically',
    },
    queue: {
      'ui:widget': 'MappingBooleanWidget',
      'ui:help': 'Events will be queued until the destination is initialized',
    },
    verbose: {
      'ui:widget': 'MappingBooleanWidget',
      'ui:help': 'Shows detailed logs for event processing and API calls',
    },
    'ui:order': ['id', 'loadScript', 'queue', 'verbose'],
  };

  const handleChange = (newOptions: unknown) => {
    if (newOptions && typeof newOptions === 'object') {
      const options = newOptions as Record<string, unknown>;

      // Update root-level properties
      Object.entries(options).forEach(([key, value]) => {
        if (value !== undefined) {
          mappingState.actions.setValue([key], value);
        } else {
          // Remove undefined values
          mappingState.actions.deleteValue([key]);
        }
      });
    }
  };

  return (
    <BaseMappingPane
      title="Options"
      description="Configure destination behavior and runtime options"
      navigation={navigation}
      className={className}
    >
      <MappingFormWrapper
        schema={schema}
        uiSchema={uiSchema}
        formData={currentOptions}
        onChange={handleChange}
        formContext={{
          navigation,
          mappingState,
          path,
        }}
      />
    </BaseMappingPane>
  );
}
