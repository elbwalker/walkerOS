import React, { useState, useEffect, useRef } from 'react';
import type { FieldProps } from '@rjsf/utils';
import { MappingCollapsible } from '../atoms/mapping-collapsible';
import { IconButton } from '../atoms/icon-button';
import { MappingFormWrapper } from '../forms/mapping-form-wrapper';
import {
  valueConfigNestedSchema,
  valueConfigNestedUiSchema,
} from '../../schemas/value-config-schema';

/**
 * MappingLoopField - Custom field for array processing with loop transformation
 *
 * Manages a loop tuple: [source, transform]
 * - source: String path to array ('nested', 'data.items') or 'this' for current value
 * - transform: ValueConfig to apply to each item in the array
 *
 * Features:
 * - Collapsible toggle interface
 * - Source path input with placeholder hints
 * - Recursive ValueConfig form for item transformation
 * - Empty state with add button
 *
 * @example
 * // In schema:
 * loop: {
 *   type: 'array',
 *   title: 'Loop',
 *   description: 'Process arrays by applying transformation to each item',
 *   items: [
 *     { type: 'string' },  // source
 *     { type: 'object' }   // transform
 *   ],
 *   minItems: 2,
 *   maxItems: 2
 * }
 *
 * // In uiSchema:
 * loop: {
 *   'ui:field': 'mappingLoop',
 * }
 *
 * @example
 * // Usage:
 * {
 *   loop: [
 *     'nested',  // Process items in event.nested array
 *     { map: { item_id: 'data.id', item_name: 'data.name' } }
 *   ]
 * }
 */
export function MappingLoopField(props: FieldProps) {
  const { formData, onChange, schema, disabled, readonly } = props;

  // Parse loop tuple [source, transform] - pure function, no state
  const parseFormData = (data: unknown): [string, Record<string, unknown>] => {
    if (Array.isArray(data) && data.length === 2) {
      return [
        (data[0] as string) || '',
        (data[1] as Record<string, unknown>) || {},
      ];
    }
    return ['', {}];
  };

  // Internal state to manage loop data
  const [source, setSource] = useState<string>(
    () => parseFormData(formData)[0],
  );
  const [transform, setTransform] = useState<Record<string, unknown>>(
    () => parseFormData(formData)[1],
  );

  // UI state - start collapsed
  const [isExpanded, setIsExpanded] = useState(false);

  // Track last serialized formData to detect real changes
  const lastFormDataRef = useRef<string>();
  // Track last onChange value to prevent redundant calls
  const lastOnChangeRef = useRef<string>();

  // Sync external changes to internal state, with change detection
  useEffect(() => {
    const currentSerialized = JSON.stringify(formData);

    // Skip if formData hasn't actually changed
    if (currentSerialized === lastFormDataRef.current) {
      return;
    }
    lastFormDataRef.current = currentSerialized;

    if (!formData) {
      if (source !== '' || Object.keys(transform).length > 0) {
        setSource('');
        setTransform({});
      }
      return;
    }

    const [newSource, newTransform] = parseFormData(formData);

    // Only update if data actually changed
    if (
      newSource !== source ||
      JSON.stringify(newTransform) !== JSON.stringify(transform)
    ) {
      setSource(newSource);
      setTransform(newTransform);
    }
  }, [formData, source, transform]);

  // Clear loop when source is empty
  useEffect(() => {
    // If source is empty, ensure we're not setting an invalid loop
    if (!source || source.trim().length === 0) {
      // Only call onChange if we need to clear an existing value
      if (formData !== undefined) {
        callOnChange(undefined);
      }
    }
  }, [source, formData]);

  // Helper to call onChange only when value actually changes
  const callOnChange = (
    value: [string, Record<string, unknown>] | undefined,
  ) => {
    const serialized = JSON.stringify(value);
    if (serialized !== lastOnChangeRef.current) {
      lastOnChangeRef.current = serialized;
      onChange(value);
    }
  };

  const handleSourceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSource = e.target.value;
    setSource(newSource);
    const validLoop = validateLoop(newSource, transform);
    callOnChange(validLoop);
  };

  const handleTransformChange = (newTransform: unknown) => {
    const newTransformObj = newTransform as Record<string, unknown>;
    setTransform(newTransformObj);
    const validLoop = validateLoop(source, newTransformObj);
    callOnChange(validLoop);
  };

  // Validate loop data and return undefined if invalid/empty
  const validateLoop = (
    sourceValue: string,
    transformValue: Record<string, unknown>,
  ): [string, Record<string, unknown>] | undefined => {
    // Source must be a non-empty string
    const hasValidSource =
      typeof sourceValue === 'string' && sourceValue.trim().length > 0;

    // Transform must be a non-empty object with at least one property
    const hasValidTransform =
      transformValue &&
      typeof transformValue === 'object' &&
      Object.keys(transformValue).length > 0;

    // Only return loop if both source and transform are valid
    if (hasValidSource && hasValidTransform) {
      return [sourceValue, transformValue];
    }

    return undefined;
  };

  const title = schema?.title || 'Loop';
  const description =
    schema?.description ||
    'Process arrays by applying transformation to each item';

  // Check if source has a value
  const hasSource = source && source.trim().length > 0;

  return (
    <div className="elb-rjsf-widget">
      <MappingCollapsible
        mode="toggle"
        title={title}
        description={description}
        isExpanded={isExpanded}
        onToggle={setIsExpanded}
      >
        <div className="elb-mapping-loop-content">
          {/* Source input - always visible */}
          <div className="elb-mapping-loop-source">
            <label className="elb-mapping-loop-label">Source array path</label>
            <input
              type="text"
              className="elb-mapping-loop-source-input"
              value={source}
              onChange={handleSourceChange}
              placeholder="e.g., nested, data.items, or 'this'"
              disabled={disabled || readonly}
            />
            <div className="elb-mapping-loop-hint">
              Path to array in event, or 'this' for current value
            </div>
          </div>

          {/* Transform section - only show when source is set */}
          {hasSource ? (
            <div className="elb-mapping-loop-transform">
              <div className="elb-mapping-loop-transform-header">
                <label className="elb-mapping-loop-label">
                  Transform each item
                </label>
                <div className="elb-mapping-loop-hint">
                  Mapping applied to each array item
                </div>
              </div>
              <div className="elb-mapping-loop-transform-form">
                <MappingFormWrapper
                  schema={valueConfigNestedSchema}
                  uiSchema={valueConfigNestedUiSchema}
                  formData={transform}
                  onChange={handleTransformChange}
                  nested={true}
                />
              </div>
            </div>
          ) : (
            <div className="elb-mapping-loop-notice">
              Enter a source array path above to configure the transformation
            </div>
          )}
        </div>
      </MappingCollapsible>
    </div>
  );
}
