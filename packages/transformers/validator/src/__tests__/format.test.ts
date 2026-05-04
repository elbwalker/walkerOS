import Ajv from 'ajv';
import { formatSchema } from '../format-schema';
import type { WalkerOS } from '@walkeros/core';

describe('Format Schema', () => {
  const ajv = new Ajv({ allErrors: true });
  const validate = ajv.compile(formatSchema);

  const validEvent: WalkerOS.Event = {
    name: 'product view',
    entity: 'product',
    action: 'view',
    data: { id: '123', name: 'Test Product' },
    context: {},
    globals: {},
    custom: {},
    user: {},
    nested: [],
    consent: {},
    id: 'evt-123',
    trigger: 'click',
    timestamp: Date.now(),
    timing: 100,
    source: {
      type: 'browser',
      platform: 'web',
      url: 'https://example.com/',
      schema: '4',
    },
  };

  it('should validate a correct WalkerOS.Event', () => {
    const result = validate(validEvent);
    expect(result).toBe(true);
    expect(validate.errors).toBeNull();
  });

  it('should reject event with missing required fields', () => {
    const invalidEvent = { ...validEvent };
    delete (invalidEvent as Record<string, unknown>).name;

    const result = validate(invalidEvent);
    expect(result).toBe(false);
    expect(validate.errors).toContainEqual(
      expect.objectContaining({
        keyword: 'required',
        params: { missingProperty: 'name' },
      }),
    );
  });

  it('should reject event with invalid name format', () => {
    const invalidEvent = { ...validEvent, name: 'singleword' };

    const result = validate(invalidEvent);
    expect(result).toBe(false);
    expect(validate.errors).toContainEqual(
      expect.objectContaining({
        keyword: 'pattern',
        instancePath: '/name',
      }),
    );
  });

  it('should reject event with wrong field type', () => {
    const invalidEvent = { ...validEvent, timestamp: 'not a number' };

    const result = validate(invalidEvent);
    expect(result).toBe(false);
    expect(validate.errors).toContainEqual(
      expect.objectContaining({
        keyword: 'type',
        instancePath: '/timestamp',
      }),
    );
  });

  it('should reject event with missing source.type', () => {
    const invalidEvent = {
      ...validEvent,
      source: { platform: 'web' } as WalkerOS.Source,
    };

    const result = validate(invalidEvent);
    expect(result).toBe(false);
    expect(validate.errors).toContainEqual(
      expect.objectContaining({
        keyword: 'required',
        instancePath: '/source',
      }),
    );
  });

  it('should validate nested array as empty', () => {
    const eventWithEmptyNested = { ...validEvent, nested: [] };

    const result = validate(eventWithEmptyNested);
    expect(result).toBe(true);
  });

  it('should validate data as any object', () => {
    const eventWithComplexData = {
      ...validEvent,
      data: { deeply: { nested: { value: 123 } } },
    };

    const result = validate(eventWithComplexData);
    expect(result).toBe(true);
  });
});
