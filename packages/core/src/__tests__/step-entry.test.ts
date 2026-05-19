import {
  validateStepEntry,
  isPathStepEntry,
  STEP_OPERATIVE_FIELDS,
} from '../step-entry';
import type { Flow } from '../types/flow';

const kinds: Flow.StepKind[] = [
  'Source',
  'Transformer',
  'Destination',
  'Store',
];

describe('validateStepEntry — common rules', () => {
  it.each(kinds)('%s: accepts package alone', (kind) => {
    expect(validateStepEntry({ package: '@walkeros/x' }, kind).ok).toBe(true);
  });

  it.each(kinds)('%s: accepts package + import', (kind) => {
    expect(
      validateStepEntry({ package: '@walkeros/x', import: 'fooFactory' }, kind)
        .ok,
    ).toBe(true);
  });

  it.each(kinds)('%s: accepts code object', (kind) => {
    expect(
      validateStepEntry({ code: { push: '$code:() => {}' } }, kind).ok,
    ).toBe(true);
  });

  it.each(kinds)(
    '%s: accepts code as a resolved function (runtime shape)',
    (kind) => {
      const fn = () => undefined;
      expect(validateStepEntry({ code: fn }, kind).ok).toBe(true);
    },
  );

  it.each(kinds)('%s: rejects code + package (CONFLICT)', (kind) => {
    const r = validateStepEntry(
      { package: '@walkeros/x', code: { push: '$code:() => {}' } },
      kind,
    );
    expect(r.ok).toBe(false);
    expect(r.code).toBe('CONFLICT');
  });

  it.each(kinds)('%s: rejects code + import (CONFLICT)', (kind) => {
    const r = validateStepEntry(
      { import: 'fooFactory', code: { push: '$code:() => {}' } },
      kind,
    );
    expect(r.ok).toBe(false);
    expect(r.code).toBe('CONFLICT');
  });

  it.each(kinds)(
    '%s: rejects import without package (MISSING_PACKAGE)',
    (kind) => {
      const r = validateStepEntry({ import: 'fooFactory' }, kind);
      expect(r.ok).toBe(false);
      expect(r.code).toBe('MISSING_PACKAGE');
    },
  );

  it.each(kinds)(
    '%s: rejects code as string (OBSOLETE_CODE_STRING)',
    (kind) => {
      const r = validateStepEntry(
        { package: '@walkeros/x', code: 'fooFactory' },
        kind,
      );
      expect(r.ok).toBe(false);
      expect(r.code).toBe('OBSOLETE_CODE_STRING');
      expect(r.reason).toContain('import: "fooFactory"');
    },
  );

  it.each(kinds)(
    '%s: rejects invalid import identifier (INVALID_IMPORT)',
    (kind) => {
      const r = validateStepEntry(
        { package: '@walkeros/x', import: '1notAnIdent' },
        kind,
      );
      expect(r.ok).toBe(false);
      expect(r.code).toBe('INVALID_IMPORT');
    },
  );

  it.each(kinds)(
    '%s: rejects code as non-object non-string (INVALID_CODE_SHAPE)',
    (kind) => {
      const r = validateStepEntry(
        { code: 42 } as unknown as Record<string, unknown>,
        kind,
      );
      expect(r.ok).toBe(false);
      expect(r.code).toBe('INVALID_CODE_SHAPE');
    },
  );

  it.each(kinds)('%s: rejects unknown keys', (kind) => {
    const r = validateStepEntry(
      { package: '@walkeros/x', rules: [] } as unknown as Record<
        string,
        unknown
      >,
      kind,
    );
    expect(r.ok).toBe(false);
    expect(r.code).toBe('UNKNOWN_KEY');
    expect(r.key).toBe('rules');
  });
});

describe('validateStepEntry — kind-specific', () => {
  it('Transformer: accepts empty entry (pass-through)', () => {
    expect(validateStepEntry({}, 'Transformer').ok).toBe(true);
  });

  it('Transformer: accepts mapping-only entry', () => {
    expect(validateStepEntry({ mapping: {} }, 'Transformer').ok).toBe(true);
  });

  it('Transformer: accepts before-only entry', () => {
    expect(validateStepEntry({ before: ['a'] }, 'Transformer').ok).toBe(true);
  });

  it.each(['Source', 'Transformer', 'Destination', 'Store'] as const)(
    '%s: accepts empty entry (no-op step)',
    (kind) => {
      expect(validateStepEntry({}, kind).ok).toBe(true);
    },
  );

  it('Store: rejects `mapping` key (UNKNOWN_KEY)', () => {
    const r = validateStepEntry(
      { package: '@walkeros/x', mapping: {} } as unknown as Record<
        string,
        unknown
      >,
      'Store',
    );
    expect(r.ok).toBe(false);
    expect(r.code).toBe('UNKNOWN_KEY');
  });

  it('Source: accepts `primary` key', () => {
    expect(
      validateStepEntry({ package: '@walkeros/x', primary: true }, 'Source').ok,
    ).toBe(true);
  });
});

describe('isPathStepEntry', () => {
  it('returns true for Transformer with mapping only', () => {
    expect(isPathStepEntry({ mapping: {} }, 'Transformer')).toBe(true);
  });
  it('returns false when package present', () => {
    expect(isPathStepEntry({ package: '@walkeros/x' }, 'Transformer')).toBe(
      false,
    );
  });
  it('returns false when import present', () => {
    expect(
      isPathStepEntry({ package: '@walkeros/x', import: 'X' }, 'Transformer'),
    ).toBe(false);
  });
  it('returns false for non-transformer kinds (no pass-through)', () => {
    expect(isPathStepEntry({ mapping: {} }, 'Source')).toBe(false);
  });
});

describe('STEP_OPERATIVE_FIELDS', () => {
  it('includes import for every kind', () => {
    for (const kind of kinds) {
      expect(STEP_OPERATIVE_FIELDS[kind]).toContain('import');
    }
  });
});
