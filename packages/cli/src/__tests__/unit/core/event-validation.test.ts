import { validateEvent } from '../../../core/event-validation.js';

describe('validateEvent', () => {
  const validEvent = { name: 'page view', data: { path: '/' } };
  const noNameEvent = { data: { id: '123' } };
  const noSpaceEvent = { name: 'pageview' };
  const emptyNameEvent = { name: '' };
  const multiWordEvent = { name: 'shopping cart add' };
  const withConsent = { name: 'page view', consent: { analytics: true } };
  const notAnObject = 'just a string';

  describe('minimal level', () => {
    it('passes valid event', () => {
      const result = validateEvent(validEvent, 'minimal');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('fails non-object input', () => {
      const result = validateEvent(notAnObject, 'minimal');
      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe('NOT_AN_OBJECT');
    });

    it('fails missing name', () => {
      const result = validateEvent(noNameEvent, 'minimal');
      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe('MISSING_EVENT_NAME');
    });

    it('fails empty name', () => {
      const result = validateEvent(emptyNameEvent, 'minimal');
      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe('EMPTY_EVENT_NAME');
    });

    it('passes event without space in name (no entity-action check)', () => {
      const result = validateEvent(noSpaceEvent, 'minimal');
      expect(result.valid).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });

    it('does not populate details', () => {
      const result = validateEvent(validEvent, 'minimal');
      expect(result.details.hasConsent).toBeUndefined();
    });
  });

  describe('standard level', () => {
    it('passes valid event', () => {
      const result = validateEvent(validEvent, 'standard');
      expect(result.valid).toBe(true);
    });

    it('fails missing name', () => {
      const result = validateEvent(noNameEvent, 'standard');
      expect(result.valid).toBe(false);
    });

    it('warns on name without space (not an error)', () => {
      const result = validateEvent(noSpaceEvent, 'standard');
      expect(result.valid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].path).toBe('name');
    });

    it('does not warn on missing consent', () => {
      const result = validateEvent(validEvent, 'standard');
      expect(result.warnings).toHaveLength(0);
    });

    it('extracts entity/action when name has space', () => {
      const result = validateEvent(validEvent, 'standard');
      expect(result.details.entity).toBe('page');
      expect(result.details.action).toBe('view');
    });

    it('handles multi-word entity', () => {
      const result = validateEvent(multiWordEvent, 'standard');
      expect(result.details.entity).toBe('shopping cart');
      expect(result.details.action).toBe('add');
    });

    it('runs Zod schema validation', () => {
      const badData = { name: 'page view', data: 'not-an-object' };
      const result = validateEvent(badData, 'standard');
      expect(result.errors.some((e) => e.code === 'SCHEMA_VALIDATION')).toBe(
        true,
      );
    });
  });

  describe('strict level', () => {
    it('passes valid event with consent', () => {
      const result = validateEvent(withConsent, 'strict');
      expect(result.valid).toBe(true);
    });

    it('fails on name without space (error, not warning)', () => {
      const result = validateEvent(noSpaceEvent, 'strict');
      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe('INVALID_EVENT_NAME');
    });

    it('warns on missing consent', () => {
      const result = validateEvent(validEvent, 'strict');
      expect(result.warnings.some((w) => w.path === 'consent')).toBe(true);
    });

    it('no consent warning when consent present', () => {
      const result = validateEvent(withConsent, 'strict');
      expect(result.warnings).toHaveLength(0);
    });

    it('populates details', () => {
      const result = validateEvent(withConsent, 'strict');
      expect(result.details.hasConsent).toBe(true);
      expect(result.details.hasData).toBe(false);
      expect(result.details.entity).toBe('page');
      expect(result.details.action).toBe('view');
    });
  });
});
