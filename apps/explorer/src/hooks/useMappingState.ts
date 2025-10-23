import { useState, useCallback, useRef } from 'react';
import type { Mapping } from '@walkeros/core';
import {
  getValueAtPath,
  setValueAtPath,
  deleteAtPath,
  parseRulePath,
  buildRulePath,
} from '../utils/mapping-path';

/**
 * Centralized mapping configuration state management
 *
 * This hook provides a single source of truth for the entire mapping config.
 * All CRUD operations go through this hook, making state management predictable
 * and testable.
 *
 * Features:
 * - Path-based value access and mutation
 * - Rule CRUD operations
 * - Immutable updates (no direct mutations)
 * - Change callback for external synchronization
 *
 * @example
 * const mappingState = useMappingState(initialMapping);
 *
 * // Read
 * const rule = mappingState.getValueAtPath(['product', 'view']);
 *
 * // Update
 * mappingState.setValueAtPath(['product', 'view', 'name'], 'view_item');
 *
 * // Delete
 * mappingState.deleteRule('product', 'view');
 */
export function useMappingState(
  initialMapping: Mapping.Config,
  onChange?: (config: Mapping.Config) => void,
) {
  const [config, setConfig] = useState<Mapping.Config>(initialMapping);

  // Track if onChange callback is currently being fired to prevent loops
  const isCallingOnChange = useRef(false);

  /**
   * Internal state updater that also triggers onChange callback
   */
  const updateConfig = useCallback(
    (newConfig: Mapping.Config) => {
      setConfig(newConfig);

      // Call onChange if provided and not already in callback
      if (onChange && !isCallingOnChange.current) {
        isCallingOnChange.current = true;
        onChange(newConfig);
        isCallingOnChange.current = false;
      }
    },
    [onChange],
  );

  /**
   * Get value at path
   */
  const getValue = useCallback(
    (path: string[]) => {
      return getValueAtPath(config, path);
    },
    [config],
  );

  /**
   * Set value at path (immutable update)
   */
  const setValue = useCallback(
    (path: string[], value: unknown) => {
      const newConfig = setValueAtPath(config, path, value) as Mapping.Config;
      updateConfig(newConfig);
    },
    [config, updateConfig],
  );

  /**
   * Delete value at path (immutable delete)
   */
  const deleteValue = useCallback(
    (path: string[]) => {
      const newConfig = deleteAtPath(config, path) as Mapping.Config;
      updateConfig(newConfig);
    },
    [config, updateConfig],
  );

  /**
   * Get list of all rules in format "entity action"
   */
  const getRuleList = useCallback((): string[] => {
    const rules: string[] = [];
    const configRecord = config as Record<string, Record<string, unknown>>;

    Object.keys(config).forEach((entity) => {
      const actions = configRecord[entity] as
        | Record<string, unknown>
        | undefined;
      if (actions && typeof actions === 'object') {
        Object.keys(actions).forEach((action) => {
          rules.push(buildRulePath(entity, action));
        });
      }
    });

    return rules.sort();
  }, [config]);

  /**
   * Get rule configuration
   */
  const getRule = useCallback(
    (entity: string, action: string) => {
      return getValue([entity, action]);
    },
    [getValue],
  );

  /**
   * Create new rule with default configuration
   */
  const createRule = useCallback(
    (entity: string, action: string, initialConfig?: unknown) => {
      const path = [entity, action];

      // Check if rule already exists
      if (getValue(path)) {
        console.warn(`Rule "${entity} ${action}" already exists`);
        return;
      }

      // Default config: just the name field
      const defaultConfig = initialConfig || {
        name: `${entity}_${action}`,
      };

      // Create entity object if it doesn't exist
      let newConfig = config;
      const configRecord = newConfig as Record<string, Record<string, unknown>>;
      if (!configRecord[entity]) {
        newConfig = { ...newConfig, [entity]: {} };
      }

      // Add the rule
      newConfig = setValueAtPath(
        newConfig,
        path,
        defaultConfig,
      ) as Mapping.Config;
      updateConfig(newConfig);
    },
    [config, getValue, updateConfig],
  );

  /**
   * Delete rule
   */
  const deleteRule = useCallback(
    (entity: string, action: string) => {
      let newConfig = deleteAtPath(config, [entity, action]) as Mapping.Config;

      // Remove entity if no actions left
      const configRecord = newConfig as Record<string, Record<string, unknown>>;
      const entityActions = configRecord[entity] as
        | Record<string, unknown>
        | undefined;
      if (entityActions && Object.keys(entityActions).length === 0) {
        newConfig = deleteAtPath(newConfig, [entity]) as Mapping.Config;
      }

      updateConfig(newConfig);
    },
    [config, updateConfig],
  );

  /**
   * Update entire config (for external changes)
   */
  const replaceConfig = useCallback(
    (newConfig: Mapping.Config) => {
      updateConfig(newConfig);
    },
    [updateConfig],
  );

  return {
    config,
    actions: {
      getValue,
      setValue,
      deleteValue,
      getRuleList,
      getRule,
      createRule,
      deleteRule,
      replaceConfig,
    },
  };
}

/**
 * Return type of useMappingState hook
 *
 * Provides centralized mapping state management with:
 * - config: Current mapping configuration
 * - actions: CRUD operations for mapping state
 *
 * @example
 * const mappingState: UseMappingStateReturn = useMappingState(initialConfig);
 */
export type UseMappingStateReturn = ReturnType<typeof useMappingState>;

/**
 * @deprecated Use UseMappingStateReturn instead
 * This alias is kept for backward compatibility and will be removed in the next major version.
 */
export type MappingState = UseMappingStateReturn;
