import { describe, it, expect } from '@jest/globals';
import { validateEvent } from '../event.js';

describe('validateEvent', () => {
  it('passes valid event with entity action format', () => {
    const result = validateEvent({
      name: 'product view',
      data: { id: '123', price: 99.99 },
    });

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.details.entity).toBe('product');
    expect(result.details.action).toBe('view');
  });

  it('fails event without space in name', () => {
    const result = validateEvent({ name: 'productview' });

    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        path: 'name',
        code: 'INVALID_EVENT_NAME',
      }),
    );
  });

  it('fails event with empty name', () => {
    const result = validateEvent({ name: '' });

    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        path: 'name',
        code: 'EMPTY_EVENT_NAME',
      }),
    );
  });

  it('fails event without name field', () => {
    const result = validateEvent({ data: { id: '123' } });

    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        path: 'name',
        code: 'MISSING_EVENT_NAME',
      }),
    );
  });

  it('warns when consent object is missing', () => {
    const result = validateEvent({ name: 'page view' });

    expect(result.warnings).toContainEqual(
      expect.objectContaining({
        path: 'consent',
        suggestion: expect.stringContaining('consent'),
      }),
    );
  });

  it('passes event with consent object without warning', () => {
    const result = validateEvent({
      name: 'page view',
      consent: { analytics: true },
    });

    const consentWarning = result.warnings.find((w) => w.path === 'consent');
    expect(consentWarning).toBeUndefined();
  });

  it('handles multi-word entity and action', () => {
    const result = validateEvent({ name: 'shopping cart add' });

    expect(result.valid).toBe(true);
    expect(result.details.entity).toBe('shopping cart');
    expect(result.details.action).toBe('add');
  });

  it('validates data properties as valid types', () => {
    const result = validateEvent({
      name: 'product view',
      data: {
        string: 'value',
        number: 42,
        boolean: true,
        nested: { key: 'value' },
        array: ['a', 'b'],
      },
    });

    expect(result.valid).toBe(true);
  });
});
