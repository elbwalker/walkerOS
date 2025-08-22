/**
 * MappingBox Model
 * Pure data layer for mapping configuration
 */

import type { Mapping, WalkerOS } from '@walkeros/core';
import { getId } from '@walkeros/core';
import type {
  EventPatternConfig,
  ValueMappingConfig,
  ValidationResult,
  ModelEvents,
} from './types';

export class MappingModel {
  private data: Mapping.Rules = {};
  private listeners: Map<keyof ModelEvents, Set<Function>> = new Map();

  // Store all mappings (not just current)
  private allMappings: Mapping.Rules = {};

  constructor(initial?: Mapping.Rules) {
    if (initial) {
      this.data = this.deepClone(initial);
      this.allMappings = this.deepClone(initial);
    }
  }

  // Event pattern management
  setEventPattern(entity: string, action: string): void {
    if (!this.data[entity]) {
      this.data[entity] = {};
    }

    // Move existing action data if it exists
    const oldKey = this.findEventKey();
    if (oldKey && oldKey !== `${entity}.${action}`) {
      const [oldEntity, oldAction] = oldKey.split('.');
      const oldData = this.data[oldEntity]?.[oldAction];
      delete this.data[oldEntity][oldAction];
      if (Object.keys(this.data[oldEntity]).length === 0) {
        delete this.data[oldEntity];
      }
      this.data[entity][action] = oldData;
    } else if (!this.data[entity][action]) {
      this.data[entity][action] = {};
    }

    this.notifyChange();
  }

  getEventPattern(): EventPatternConfig {
    const key = this.findEventKey();
    if (!key) return { entity: '*', action: '*' };

    const [entity, action] = key.split('.');
    return {
      entity,
      action,
      isWildcard: {
        entity: entity === '*',
        action: action === '*',
      },
    };
  }

  // Value mapping management
  setValueMapping(path: string, config: Mapping.Value): void {
    const eventKey = this.findEventKey();
    if (!eventKey) {
      this.setEventPattern('*', '*');
    }

    const [entity, action] = this.findEventKey()!.split('.');
    const rule = this.getOrCreateRule(entity, action);

    if (!rule.data) {
      rule.data = {};
    }

    if (typeof rule.data !== 'object' || !rule.data.map) {
      rule.data = { map: {} };
    }

    (rule.data as any).map[path] = config;
    this.notifyChange();
  }

  removeValueMapping(path: string): void {
    const eventKey = this.findEventKey();
    if (!eventKey) return;

    const [entity, action] = eventKey.split('.');
    const rule = this.data[entity]?.[action];

    if (rule?.data && typeof rule.data === 'object' && 'map' in rule.data) {
      delete (rule.data as any).map[path];

      // Clean up empty objects
      if (Object.keys((rule.data as any).map).length === 0) {
        delete (rule.data as any).map;
      }
      if (Object.keys(rule.data).length === 0) {
        delete rule.data;
      }
    }

    this.notifyChange();
  }

  getValueMappings(): ValueMappingConfig[] {
    const eventKey = this.findEventKey();
    if (!eventKey) return [];

    const [entity, action] = eventKey.split('.');
    const rule = this.data[entity]?.[action];

    if (!rule?.data || typeof rule.data !== 'object' || !('map' in rule.data)) {
      return [];
    }

    const map = (rule.data as any).map;
    return this.flattenMappingTree(map);
  }

  private flattenMappingTree(
    mappings: any,
    parentId?: string,
    depth = 0,
  ): ValueMappingConfig[] {
    if (!mappings || typeof mappings !== 'object') return [];

    const result: ValueMappingConfig[] = [];

    Object.entries(mappings).forEach(([key, value]) => {
      const config: ValueMappingConfig = {
        id: this.generateId(),
        key,
        type: this.detectMappingType(value),
        value,
        expanded: depth < 2, // Auto-expand first 2 levels
        depth,
        parentId,
        children: [],
        isValid: this.validateMappingValue(value),
        validationError: this.validateMappingValue(value)
          ? undefined
          : 'Invalid mapping configuration',
      };

      // Handle nested structures
      if (
        config.type === 'map' &&
        value &&
        typeof value === 'object' &&
        'map' in value
      ) {
        config.children = this.flattenMappingTree(
          value.map,
          config.id,
          depth + 1,
        );
      } else if (
        config.type === 'loop' &&
        Array.isArray(value) &&
        value.length === 2
      ) {
        const [source, mapping] = value;
        if (mapping && typeof mapping === 'object' && 'map' in mapping) {
          config.children = this.flattenMappingTree(
            mapping.map,
            config.id,
            depth + 1,
          );
        }
      } else if (config.type === 'set' && Array.isArray(value)) {
        value.forEach((item, index) => {
          if (item && typeof item === 'object' && 'map' in item) {
            const setChild: ValueMappingConfig = {
              id: this.generateId(),
              key: `[${index}]`,
              type: 'map',
              value: item,
              expanded: false,
              depth: depth + 1,
              parentId: config.id,
              children: this.flattenMappingTree(item.map, config.id, depth + 2),
              isValid: true,
            };
            config.children!.push(setChild);
          }
        });
      }

      result.push(config);
    });

    return result;
  }

  private validateMappingValue(value: any): boolean {
    if (typeof value === 'string') return value.length > 0;
    if (typeof value === 'object' && value !== null) {
      if ('value' in value) return true;
      if ('fn' in value)
        return typeof value.fn === 'function' || typeof value.fn === 'string';
      if ('map' in value) return typeof value.map === 'object';
      if ('loop' in value)
        return Array.isArray(value.loop) && value.loop.length === 2;
      if ('set' in value) return Array.isArray(value.set);
      if ('condition' in value) return typeof value.condition === 'function';
    }
    return false;
  }

  // Settings management
  setName(name: string): void {
    const eventKey = this.findEventKey();
    if (!eventKey) {
      this.setEventPattern('*', '*');
    }

    const [entity, action] = this.findEventKey()!.split('.');
    const rule = this.getOrCreateRule(entity, action);
    rule.name = name;
    this.notifyChange();
  }

  setConsent(consent: WalkerOS.Consent): void {
    const eventKey = this.findEventKey();
    if (!eventKey) {
      this.setEventPattern('*', '*');
    }

    const [entity, action] = this.findEventKey()!.split('.');
    const rule = this.getOrCreateRule(entity, action);
    rule.consent = consent;
    this.notifyChange();
  }

  // Data access
  toJSON(): Mapping.Rules {
    return this.deepClone(this.data);
  }

  fromJSON(config: Mapping.Rules): void {
    this.data = this.deepClone(config);
    this.allMappings = this.deepClone(config);
    this.notifyChange();
  }

  // Enhanced methods for multi-entity mapping handling
  getAllEventPatterns(): Array<{
    entity: string;
    action: string;
    hasValueMappings: boolean;
    mappingCount: number;
  }> {
    const patterns: Array<{
      entity: string;
      action: string;
      hasValueMappings: boolean;
      mappingCount: number;
    }> = [];

    for (const [entity, actions] of Object.entries(this.allMappings)) {
      for (const [action, rule] of Object.entries(actions)) {
        const hasValueMappings = !!(
          rule.data &&
          typeof rule.data === 'object' &&
          'map' in rule.data
        );
        const mappingCount = hasValueMappings
          ? Object.keys((rule.data as any).map || {}).length
          : 0;

        patterns.push({ entity, action, hasValueMappings, mappingCount });
      }
    }

    return patterns;
  }

  getFullMappingConfiguration(): Mapping.Rules {
    // Return complete mapping configuration with all entities and actions
    return this.deepClone(this.allMappings);
  }

  importFullConfiguration(config: Mapping.Rules): void {
    this.allMappings = this.deepClone(config);

    // If there's a current mapping, switch to the first available or create empty
    const patterns = this.getAllEventPatterns();
    if (patterns.length > 0) {
      const first = patterns[0];
      this.switchToMapping(first.entity, first.action);
    } else {
      this.data = {};
    }

    this.notifyChange();
  }

  getAdvancedMappingStats(): {
    totalEntities: number;
    totalActions: number;
    totalMappings: number;
    complexMappings: number;
    functionMappings: number;
  } {
    let totalEntities = 0;
    let totalActions = 0;
    let totalMappings = 0;
    let complexMappings = 0;
    let functionMappings = 0;

    for (const [entity, actions] of Object.entries(this.allMappings)) {
      totalEntities++;

      for (const [action, rule] of Object.entries(actions)) {
        totalActions++;

        if (rule.data && typeof rule.data === 'object' && 'map' in rule.data) {
          const mappings = this.countMappingsRecursively(
            (rule.data as any).map,
          );
          totalMappings += mappings.total;
          complexMappings += mappings.complex;
          functionMappings += mappings.functions;
        }
      }
    }

    return {
      totalEntities,
      totalActions,
      totalMappings,
      complexMappings,
      functionMappings,
    };
  }

  private countMappingsRecursively(mappings: any): {
    total: number;
    complex: number;
    functions: number;
  } {
    if (!mappings || typeof mappings !== 'object') {
      return { total: 0, complex: 0, functions: 0 };
    }

    let total = 0;
    let complex = 0;
    let functions = 0;

    for (const [key, value] of Object.entries(mappings)) {
      total++;

      const type = this.detectMappingType(value);

      if (['map', 'loop', 'set', 'condition'].includes(type)) {
        complex++;

        // Count nested mappings
        if (
          type === 'map' &&
          value &&
          typeof value === 'object' &&
          'map' in value
        ) {
          const nested = this.countMappingsRecursively((value as any).map);
          total += nested.total;
          complex += nested.complex;
          functions += nested.functions;
        } else if (
          type === 'loop' &&
          Array.isArray(value) &&
          value.length === 2
        ) {
          const [source, mapping] = value;
          if (mapping && typeof mapping === 'object' && 'map' in mapping) {
            const nested = this.countMappingsRecursively(mapping.map);
            total += nested.total;
            complex += nested.complex;
            functions += nested.functions;
          }
        }
      } else if (type === 'function') {
        functions++;
      }
    }

    return { total, complex, functions };
  }

  hasMapping(entity: string, action: string): boolean {
    return !!this.allMappings[entity]?.[action];
  }

  switchToMapping(entity: string, action: string): void {
    // Save current mapping to allMappings
    const currentKey = this.findEventKey();
    if (currentKey) {
      const [currEntity, currAction] = currentKey.split('.');
      if (this.data[currEntity]?.[currAction]) {
        if (!this.allMappings[currEntity]) {
          this.allMappings[currEntity] = {};
        }
        this.allMappings[currEntity][currAction] = this.deepClone(
          this.data[currEntity][currAction],
        );
      }
    }

    // Load or create new mapping
    this.data = {};
    if (this.allMappings[entity]?.[action]) {
      // Load existing
      this.data[entity] = {
        [action]: this.deepClone(this.allMappings[entity][action]),
      };
    } else {
      // Create new
      this.data[entity] = {
        [action]: {},
      };
    }

    this.notifyChange();
  }

  getAvailableActions(entity: string): string[] {
    if (!this.allMappings[entity]) return [];
    return Object.keys(this.allMappings[entity]);
  }

  deleteMapping(entity: string, action: string): void {
    // Remove from current data
    if (this.data[entity]?.[action]) {
      delete this.data[entity][action];
      if (Object.keys(this.data[entity]).length === 0) {
        delete this.data[entity];
      }
    }

    // Remove from all mappings
    if (this.allMappings[entity]?.[action]) {
      delete this.allMappings[entity][action];
      if (Object.keys(this.allMappings[entity]).length === 0) {
        delete this.allMappings[entity];
      }
    }

    this.notifyChange();
  }

  validate(): ValidationResult {
    const errors: any[] = [];

    // Basic validation
    if (Object.keys(this.data).length === 0) {
      return { valid: true };
    }

    // Check for valid entity/action patterns
    for (const [entity, actions] of Object.entries(this.data)) {
      if (!entity || entity.trim() === '') {
        errors.push({ path: 'entity', message: 'Entity cannot be empty' });
      }

      for (const [action] of Object.entries(actions)) {
        if (!action || action.trim() === '') {
          errors.push({
            path: `${entity}.action`,
            message: 'Action cannot be empty',
          });
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  // Event handling
  on<K extends keyof ModelEvents>(event: K, handler: ModelEvents[K]): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);
  }

  off<K extends keyof ModelEvents>(event: K, handler: ModelEvents[K]): void {
    this.listeners.get(event)?.delete(handler);
  }

  // Private helpers
  private findEventKey(): string | null {
    const entities = Object.keys(this.data);
    if (entities.length === 0) return null;

    const entity = entities[0];
    const actions = Object.keys(this.data[entity]);
    if (actions.length === 0) return null;

    return `${entity}.${actions[0]}`;
  }

  private getOrCreateRule(entity: string, action: string): Mapping.Rule {
    if (!this.data[entity]) {
      this.data[entity] = {};
    }
    if (!this.data[entity][action]) {
      this.data[entity][action] = {};
    }
    return this.data[entity][action] as Mapping.Rule;
  }

  private detectMappingType(value: any): ValueMappingConfig['type'] {
    if (typeof value === 'string') return 'key';
    if (typeof value === 'object' && value !== null) {
      if ('value' in value) return 'static';
      if ('fn' in value) return 'function';
      if ('map' in value) return 'map';
      if ('loop' in value) return 'loop';
      if ('set' in value) return 'set';
      if ('condition' in value) return 'condition';
    }
    return 'static';
  }

  private deepClone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
  }

  private generateId(): string {
    return getId(9);
  }

  private notifyChange(): void {
    const listeners = this.listeners.get('change');
    if (listeners) {
      listeners.forEach((handler) => handler(this.toJSON()));
    }

    // Auto-validate on change
    const result = this.validate();
    const validateListeners = this.listeners.get('validate');
    if (validateListeners) {
      validateListeners.forEach((handler) => handler(result));
    }
  }
}
