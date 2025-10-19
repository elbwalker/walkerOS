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
  const parseFormData = (
    data: unknown,
  ): [string, Record<string, unknown> | undefined] => {
    if (Array.isArray(data) && data.length === 2) {
      const source = (data[0] as string) || '';
      const transform = (data[1] as Record<string, unknown>) || undefined;
      return [source, transform];
    }
    return ['', undefined];
  };

  // Validate loop data and return undefined if invalid/empty
  const validateLoop = (
    sourceValue: string,
    transformValue: Record<string, unknown> | undefined,
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

  // Internal state to manage loop data
  const [source, setSource] = useState<string>(
    () => parseFormData(formData)[0],
  );
  const [transform, setTransform] = useState<
    Record<string, unknown> | undefined
  >(() => parseFormData(formData)[1]);

  // UI state - start collapsed
  const [isExpanded, setIsExpanded] = useState(false);

  // Track previous formData to avoid redundant updates
  const prevFormDataRef = useRef<unknown>(formData);

  // Sync external changes to internal state
  useEffect(() => {
    // Only sync if formData actually changed from external source
    if (prevFormDataRef.current === formData) {
      return;
    }
    prevFormDataRef.current = formData;

    if (!formData) {
      if (source !== '' || transform !== undefined) {
        setSource('');
        setTransform(undefined);
      }
      return;
    }

    const [newSource, newTransform] = parseFormData(formData);

    // Only update if data actually changed (prevent infinite loops)
    if (
      newSource !== source ||
      JSON.stringify(newTransform) !== JSON.stringify(transform)
    ) {
      setSource(newSource);
      setTransform(newTransform);
    }
  }, [formData]);

  const handleSourceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSource = e.target.value;
    setSource(newSource);

    // If source becomes empty, clear transform and send undefined
    if (!newSource || newSource.trim().length === 0) {
      setTransform(undefined);
      prevFormDataRef.current = undefined;
      onChange(undefined);
      return;
    }

    // Validate and send current state
    const validLoop = validateLoop(newSource, transform);

    // Update ref before calling onChange to prevent sync loop
    prevFormDataRef.current = validLoop;
    onChange(validLoop);
  };

  const handleTransformChange = (newTransform: unknown) => {
    const newTransformObj = newTransform as Record<string, unknown> | undefined;
    setTransform(newTransformObj);

    // Validate and update formData
    const validLoop = validateLoop(source, newTransformObj);

    // Update ref before calling onChange to prevent sync loop
    prevFormDataRef.current = validLoop;
    onChange(validLoop);
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

          {/* Transform section - only visible when source is valid */}
          {hasSource && (
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
          )}
        </div>
      </MappingCollapsible>
    </div>
  );
}
