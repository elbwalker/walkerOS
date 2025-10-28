import type { UseMappingStateReturn } from '../../hooks/useMappingState';
import type { UseMappingNavigationReturn } from '../../hooks/useMappingNavigation';
import type { RJSFSchema } from '@rjsf/utils';
import { RuleTile, type RuleTileStatus } from '../atoms/config-tile';
import { BaseMappingPane } from '../atoms/base-mapping-pane';
import { detectFromJsonSchema } from '../../utils/type-detector';
import type { NodeType } from '../../hooks/useMappingNavigation';

/**
 * Settings Overview Pane - Shows config-level settings as tiles
 *
 * Similar to RuleOverview but for config.settings instead of mapping rules.
 * Shows destination-specific settings like pixelId, measurementId, etc.
 *
 * Features:
 * - Displays configured settings as tiles with values
 * - Shows available settings from schema (if provided)
 * - Click tile to navigate to detailed editor
 * - Schema-driven type detection for correct editor pane
 *
 * @example
 * <SettingsOverviewPane
 *   path={['settings']}
 *   mappingState={configState}
 *   navigation={navigation}
 *   schema={settingsSchema}
 * />
 */
export interface SettingsOverviewPaneProps {
  path: string[];
  mappingState: UseMappingStateReturn;
  navigation: UseMappingNavigationReturn;
  schema?: RJSFSchema;
  className?: string;
}

function getSettingStatus(value: unknown): RuleTileStatus {
  if (value === undefined || value === null) {
    return { enabled: false, text: 'Not set' };
  }

  // Display value preview
  if (typeof value === 'string') {
    return { enabled: true, text: value };
  }
  if (typeof value === 'number') {
    return { enabled: true, text: String(value) };
  }
  if (typeof value === 'boolean') {
    return { enabled: true, text: value ? 'Enabled' : 'Disabled' };
  }
  if (Array.isArray(value)) {
    return { enabled: true, text: `${value.length} items` };
  }
  if (typeof value === 'object') {
    const keys = Object.keys(value);
    return { enabled: true, text: `${keys.length} properties` };
  }

  return { enabled: true, text: 'Configured' };
}

export function SettingsOverviewPane({
  path,
  mappingState,
  navigation,
  schema,
  className = '',
}: SettingsOverviewPaneProps) {
  const settings = mappingState.actions.getValue(path) as
    | Record<string, unknown>
    | undefined;

  // Gather all setting keys (from value + schema)
  const configuredKeys = settings ? Object.keys(settings) : [];
  const schemaKeys = schema?.properties ? Object.keys(schema.properties) : [];
  const allKeys = Array.from(
    new Set([...configuredKeys, ...schemaKeys]),
  ).sort();

  // Separate configured vs available
  const configuredSettings: Array<{
    key: string;
    title: string;
    description?: string;
    nodeType: NodeType;
    value: unknown;
  }> = [];

  const availableSettings: Array<{
    key: string;
    title: string;
    description?: string;
    nodeType: NodeType;
  }> = [];

  allKeys.forEach((key) => {
    const propSchema = schema?.properties?.[key] as RJSFSchema | undefined;
    const title =
      propSchema?.title || key.charAt(0).toUpperCase() + key.slice(1);
    const description = propSchema?.description;
    const nodeType = propSchema
      ? detectFromJsonSchema(propSchema)
      : 'valueConfig';

    if (settings && key in settings) {
      configuredSettings.push({
        key,
        title,
        description,
        nodeType,
        value: settings[key],
      });
    } else {
      availableSettings.push({
        key,
        title,
        description,
        nodeType,
      });
    }
  });

  const handleSettingClick = (key: string, nodeType: NodeType) => {
    navigation.openTab([...path, key], nodeType);
  };

  return (
    <BaseMappingPane
      title="Settings"
      description={
        configuredSettings.length === 0
          ? 'No settings configured. Click a tile to add settings.'
          : `${configuredSettings.length} ${configuredSettings.length === 1 ? 'setting' : 'settings'} configured`
      }
      navigation={navigation}
      className={className}
    >
      <div className="elb-mapping-rule-section-grid">
        {/* Configured settings */}
        {configuredSettings.map((setting) => (
          <RuleTile
            key={setting.key}
            label={setting.title}
            description={setting.description || ''}
            status={getSettingStatus(setting.value)}
            onClick={() => handleSettingClick(setting.key, setting.nodeType)}
          />
        ))}
      </div>

      {/* Available settings (from schema) */}
      {availableSettings.length > 0 && (
        <div className="elb-mapping-rule-section">
          <h3 className="elb-mapping-rule-section-title">Available Settings</h3>
          <p className="elb-mapping-rule-section-description">
            Click to configure additional destination settings
          </p>
          <div className="elb-mapping-rule-section-grid">
            {availableSettings.map((setting) => (
              <RuleTile
                key={setting.key}
                label={setting.title}
                description={setting.description || ''}
                status={{ enabled: false, text: 'Not set' }}
                onClick={() =>
                  handleSettingClick(setting.key, setting.nodeType)
                }
              />
            ))}
          </div>
        </div>
      )}
    </BaseMappingPane>
  );
}
