import React, { useState, useEffect } from 'react';
import type { WidgetProps } from '@rjsf/utils';
import { CollapsibleSection } from './mapping-collapsible';
import { ConsentRow } from '../molecules/mapping-consent-row';
import { IconButton } from './icon-button';

/**
 * MappingConsentWidget - RJSF widget for consent object
 *
 * Manages consent requirements as an object: { [consentType: string]: boolean }
 * where true = granted required, false = denied required
 *
 * States:
 * - Default (no consent): Shows grey "+ Require consent" button
 * - With data: Shows collapsible section with consent rows
 *
 * @example
 * // In schema:
 * const schema = {
 *   type: 'object',
 *   properties: {
 *     consent: {
 *       type: 'object',
 *       title: 'Consent',
 *       description: 'Required consent states'
 *     }
 *   }
 * }
 *
 * @example
 * // In uiSchema:
 * const uiSchema = {
 *   consent: {
 *     'ui:widget': 'mappingConsent'
 *   }
 * }
 */
export function MappingConsentWidget(props: WidgetProps) {
  const {
    id,
    value,
    onChange,
    disabled,
    readonly,
    rawErrors = [],
    schema,
  } = props;

  const consentData = (value as Record<string, boolean> | undefined) || {};
  const hasConsent = Object.keys(consentData).length > 0;

  // Extract title and description from schema
  const title = schema?.title || 'Consent';
  const description = schema?.description;

  // Start expanded if we have existing consent data
  const [isExpanded, setIsExpanded] = useState(hasConsent);

  // Update expanded state when consent data changes (e.g., switching between mapping rules)
  useEffect(() => {
    setIsExpanded(hasConsent);
  }, [hasConsent]);

  const handleAddConsent = () => {
    // Add a new consent entry with empty key and true value (checked by default)
    const newConsent = { ...consentData, '': true };
    onChange(newConsent);
    if (!isExpanded) {
      setIsExpanded(true);
    }
  };

  const handleUpdateConsentType = (oldKey: string, newKey: string) => {
    if (oldKey === newKey) return;

    const newConsent = { ...consentData };
    const value = newConsent[oldKey];
    delete newConsent[oldKey];

    // Only add if newKey is not empty
    if (newKey.trim()) {
      newConsent[newKey] = value;
    }

    // If no entries left, set to undefined
    const finalConsent =
      Object.keys(newConsent).length > 0 ? newConsent : undefined;
    onChange(finalConsent);
  };

  const handleUpdateGranted = (key: string, granted: boolean) => {
    const newConsent = { ...consentData, [key]: granted };
    onChange(newConsent);
  };

  const handleRemove = (key: string) => {
    const newConsent = { ...consentData };
    delete newConsent[key];

    // If no entries left, set to undefined
    const finalConsent =
      Object.keys(newConsent).length > 0 ? newConsent : undefined;
    onChange(finalConsent);
  };

  const hasError = rawErrors && rawErrors.length > 0;

  return (
    <div className="elb-rjsf-widget">
      <div className="elb-consent-widget-wrapper">
        <CollapsibleSection
          title={title}
          description={description}
          isExpanded={isExpanded}
          onToggle={setIsExpanded}
        >
          {hasConsent ? (
            <div className="elb-consent-rows">
              {Object.entries(consentData).map(([key, granted], index) => (
                <ConsentRow
                  key={index}
                  consentType={key}
                  granted={granted}
                  onConsentTypeChange={(newKey) =>
                    handleUpdateConsentType(key, newKey)
                  }
                  onGrantedChange={(newGranted) =>
                    handleUpdateGranted(key, newGranted)
                  }
                  onRemove={() => handleRemove(key)}
                />
              ))}
              <IconButton
                icon="add"
                variant="default"
                onClick={handleAddConsent}
                disabled={disabled || readonly}
                className="elb-consent-add-row-button"
              >
                Add consent
              </IconButton>
            </div>
          ) : (
            <IconButton
              icon="add"
              variant="default"
              onClick={handleAddConsent}
              disabled={disabled || readonly}
              className="elb-consent-add-button"
            >
              Require consent
            </IconButton>
          )}
        </CollapsibleSection>
      </div>
      {hasError && (
        <div className="elb-rjsf-error">
          {rawErrors.map((error, index) => (
            <div key={index}>{error}</div>
          ))}
        </div>
      )}
    </div>
  );
}
