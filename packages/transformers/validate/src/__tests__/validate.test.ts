import type { WalkerOS } from '@walkeros/core';
import { getValidator, validateEventAgainstContract } from '../validate';
import type { ContractSource } from '../types';

const pageViewSchema = {
  type: 'object',
  properties: {
    name: { type: 'string', const: 'page view' },
    data: {
      type: 'object',
      required: ['title', 'path'],
      properties: { title: { type: 'string' }, path: { type: 'string' } },
    },
  },
  required: ['name', 'data'],
};

const contractRule = (
  events: Record<string, Record<string, Record<string, unknown>>>,
): ContractSource => ({ events });

describe('validateEventAgainstContract', () => {
  it('valid event against a referenced schema returns isValid:true, no errors', () => {
    const event: WalkerOS.DeepPartialEvent = {
      name: 'page view',
      entity: 'page',
      action: 'view',
      data: { title: 'Home', path: '/' },
    };
    const result = validateEventAgainstContract(event, undefined, {
      contracts: [contractRule({ page: { view: pageViewSchema } })],
    });
    expect(result).toEqual({ isValid: true, errors: [] });
  });

  it('invalid event with two missing top-level required fields reports two errors', () => {
    // Flat top-level required so the error count is the two missing fields,
    // with no nested `properties` wrapper unit from @cfworker.
    const topLevelRequired = {
      type: 'object',
      required: ['name', 'data'],
      properties: { name: { type: 'string' } },
    };
    const event: WalkerOS.DeepPartialEvent = {
      entity: 'page',
      action: 'view',
    };
    const result = validateEventAgainstContract(event, undefined, {
      contracts: [contractRule({ page: { view: topLevelRequired } })],
    });
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBe(2);
    result.errors.forEach((issue) => {
      expect(typeof issue.path).toBe('string');
      expect(typeof issue.message).toBe('string');
      expect(issue.level).toBe('error');
    });
  });

  it('selects a wildcard *.* schema when no specific match exists', () => {
    const event: WalkerOS.DeepPartialEvent = {
      name: 'order complete',
      entity: 'order',
      action: 'complete',
    };
    const result = validateEventAgainstContract(event, undefined, {
      contracts: [
        contractRule({
          '*': { '*': { type: 'object', required: ['data'] } },
        }),
      ],
    });
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBe(1);
  });

  it('prefers entity.action over entity.*', () => {
    const event: WalkerOS.DeepPartialEvent = {
      name: 'page view',
      entity: 'page',
      action: 'view',
      data: { title: 'Home', path: '/' },
    };
    const result = validateEventAgainstContract(event, undefined, {
      contracts: [
        contractRule({
          page: {
            '*': { type: 'object', required: ['nonexistent'] },
            view: pageViewSchema,
          },
        }),
      ],
    });
    // entity.action (view) passes; entity.* (requires nonexistent) is NOT applied
    expect(result).toEqual({ isValid: true, errors: [] });
  });

  it('applies an inline whole-event JSON Schema (no events key)', () => {
    const event: WalkerOS.DeepPartialEvent = {
      name: 'page view',
      entity: 'page',
      action: 'view',
    };
    const inline: ContractSource = {
      type: 'object',
      properties: { name: { const: 'order complete' } },
    };
    const result = validateEventAgainstContract(event, undefined, {
      contracts: [inline],
    });
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(1);
  });

  it('format:true passes a well-formed event', () => {
    const event: WalkerOS.DeepPartialEvent = {
      name: 'page view',
      entity: 'page',
      action: 'view',
      data: { title: 'Home' },
    };
    const result = validateEventAgainstContract(event, undefined, {
      format: true,
    });
    expect(result).toEqual({ isValid: true, errors: [] });
  });

  it('format:true allows a missing entity (canonical partial: all fields optional)', () => {
    // format:true now validates the canonical partialEventJsonSchema, where
    // every field is optional. Missing fields pass; format checks STRUCTURE
    // and TYPES, not presence. This is the documented widening over the older
    // name/entity/action-required check.
    const event: WalkerOS.DeepPartialEvent = {
      name: 'page view',
      action: 'view',
    };
    const result = validateEventAgainstContract(event, undefined, {
      format: true,
    });
    expect(result).toEqual({ isValid: true, errors: [] });
  });

  it('format:true passes a full well-formed event', () => {
    const event: WalkerOS.DeepPartialEvent = {
      name: 'order complete',
      entity: 'order',
      action: 'complete',
      data: { id: 'O-1', total: 42.5 },
      context: { stage: ['checkout', 0] },
      timestamp: Date.now(),
    };
    const result = validateEventAgainstContract(event, undefined, {
      format: true,
    });
    expect(result).toEqual({ isValid: true, errors: [] });
  });

  it('format:true rejects an empty event id', () => {
    // The canonical structural schema (a documented superset of the old
    // name/entity/action-only check) requires id to be a non-empty string
    // (minLength:1). An empty id is a valid DeepPartialEvent at compile time
    // but fails the canonical schema.
    const event: WalkerOS.DeepPartialEvent = {
      name: 'page view',
      entity: 'page',
      action: 'view',
      id: '',
    };
    const result = validateEventAgainstContract(event, undefined, {
      format: true,
    });
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(1);
  });

  it('format:true rejects a non-positive timestamp', () => {
    // timestamp must be an integer > 0 (exclusiveMinimum:0). A negative value
    // is a valid DeepPartialEvent (number) but fails the canonical schema,
    // proving format:true checks the full structure, not just name/entity/action.
    const event: WalkerOS.DeepPartialEvent = {
      name: 'page view',
      entity: 'page',
      action: 'view',
      timestamp: -1,
    };
    const result = validateEventAgainstContract(event, undefined, {
      format: true,
    });
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(1);
  });

  it('ANDs across two contract sources and aggregates errors', () => {
    const topLevelRequired = {
      type: 'object',
      required: ['name', 'data'],
      properties: { name: { type: 'string' } },
    };
    const event: WalkerOS.DeepPartialEvent = {
      entity: 'page',
      action: 'view',
    };
    const inline: ContractSource = {
      type: 'object',
      properties: { entity: { const: 'order' } },
    };
    const result = validateEventAgainstContract(event, undefined, {
      contracts: [contractRule({ page: { view: topLevelRequired } }), inline],
    });
    expect(result.isValid).toBe(false);
    // Aggregated across both sources: 2 missing top-level required from the
    // rule + 2 from the inline const mismatch (@cfworker emits a parent
    // `properties` wrapper unit alongside the leaf `const` unit) = 4.
    expect(result.errors.length).toBe(4);
  });

  it('returns isValid:true when no contract entry matches (no constraint)', () => {
    const event: WalkerOS.DeepPartialEvent = {
      name: 'order complete',
      entity: 'order',
      action: 'complete',
    };
    const result = validateEventAgainstContract(event, undefined, {
      contracts: [contractRule({ page: { view: pageViewSchema } })],
    });
    expect(result).toEqual({ isValid: true, errors: [] });
  });

  it('reuses a cached Validator for an equal (re-cloned) schema', () => {
    // @cfworker's Validator export is a non-configurable getter, so a
    // constructor spy is impossible without casts. Assert the cache contract
    // directly: two structurally equal but distinct schema objects (as happens
    // when a flow re-clones its config) resolve to the same Validator instance.
    const schemaA = {
      type: 'object',
      required: ['name'],
      properties: { name: { type: 'string' } },
    };
    const schemaB = {
      type: 'object',
      required: ['name'],
      properties: { name: { type: 'string' } },
    };
    expect(schemaA).not.toBe(schemaB);
    expect(getValidator(schemaA)).toBe(getValidator(schemaB));
  });
});
