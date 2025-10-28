import type { UseMappingNavigationReturn } from '../../hooks/useMappingNavigation';
import type { ValidationError } from '../../utils/config-validator';
import { formatPath, groupErrorsBySection } from '../../utils/config-validator';
import { BaseMappingPane } from '../atoms/base-mapping-pane';
import { detectFromJsonSchema } from '../../utils/type-detector';
import type { NodeType } from '../../hooks/useMappingNavigation';
import { getRootPropertyNodeType } from '../../schemas/destination-config-structure';

/**
 * Validation Overview Pane - Shows all validation errors in the config
 *
 * Displays a list of all fields that have validation errors, grouped by section.
 * Each error shows the path, current value, and error message.
 * Clicking an error navigates to that field for editing.
 *
 * @example
 * <ValidationOverviewPane
 *   errors={validationErrors}
 *   navigation={navigation}
 * />
 */
export interface ValidationOverviewPaneProps {
  errors: ValidationError[];
  navigation: UseMappingNavigationReturn;
  className?: string;
}

/**
 * Determine the appropriate NodeType for navigating to an error path
 */
function getNodeTypeForErrorPath(error: ValidationError): NodeType {
  const path = error.path;

  // Check if it's a root property
  if (path.length === 1) {
    const rootType = getRootPropertyNodeType(path[0]);
    if (rootType) return rootType as NodeType;
  }

  // Check if it's a mapping rule property
  if (path.length >= 4 && path[0] === 'mapping') {
    const propertyName = path[3];
    if (propertyName === 'name') return 'name';
    if (propertyName === 'batch') return 'batch';
    if (propertyName === 'consent') return 'consent';
  }

  // Use schema to detect type if available
  if (error.schema) {
    const detectedType = detectFromJsonSchema(error.schema);
    if (detectedType) return detectedType;
  }

  // Default to primitive
  return 'primitive';
}

/**
 * Format value for display (truncate if too long)
 */
function formatValue(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';

  const str = typeof value === 'string' ? value : JSON.stringify(value);
  const maxLength = 50;

  if (str.length > maxLength) {
    return str.substring(0, maxLength) + '...';
  }

  return str;
}

/**
 * Get a nice section title from section key
 */
function getSectionTitle(section: string): string {
  const titles: Record<string, string> = {
    settings: 'Settings',
    mapping: 'Mapping Rules',
    policy: 'Policy',
    consent: 'Consent',
    data: 'Data',
  };

  return titles[section] || section.charAt(0).toUpperCase() + section.slice(1);
}

export function ValidationOverviewPane({
  errors,
  navigation,
  className = '',
}: ValidationOverviewPaneProps) {
  const groupedErrors = groupErrorsBySection(errors);
  const sections = Object.keys(groupedErrors).sort();

  const handleErrorClick = (error: ValidationError) => {
    const nodeType = getNodeTypeForErrorPath(error);
    navigation.openTab(error.path, nodeType);
  };

  return (
    <BaseMappingPane
      title="Validation Errors"
      description={
        errors.length === 0
          ? 'No validation errors found. All fields are valid.'
          : `${errors.length} validation ${errors.length === 1 ? 'error' : 'errors'} found in your configuration.`
      }
      navigation={navigation}
      className={className}
    >
      {errors.length === 0 ? (
        <div className="elb-mapping-rule-section">
          <div
            style={{
              padding: '40px 20px',
              textAlign: 'center',
              color: 'var(--color-text-muted)',
            }}
          >
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>✓</div>
            <div style={{ fontSize: '16px', fontWeight: 500 }}>
              All fields are valid
            </div>
            <div style={{ fontSize: '14px', marginTop: '8px' }}>
              Your configuration has no validation errors.
            </div>
          </div>
        </div>
      ) : (
        sections.map((section) => (
          <div key={section} className="elb-mapping-rule-section">
            <h3 className="elb-mapping-rule-section-title">
              {getSectionTitle(section)}
            </h3>
            <div className="elb-validation-errors-list">
              {groupedErrors[section].map((error, index) => (
                <div
                  key={`${formatPath(error.path)}-${index}`}
                  className="elb-validation-error-item"
                  onClick={() => handleErrorClick(error)}
                >
                  <div className="elb-validation-error-icon">⚠</div>
                  <div className="elb-validation-error-content">
                    <div className="elb-validation-error-path">
                      {formatPath(error.path)}
                    </div>
                    <div className="elb-validation-error-message">
                      {error.error}
                    </div>
                    <div className="elb-validation-error-value">
                      Current value: <code>{formatValue(error.value)}</code>
                    </div>
                  </div>
                  <div className="elb-validation-error-action">→</div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </BaseMappingPane>
  );
}
