import { schemas } from '@walkeros/core/dev';
import { eventFormatSchema } from '../event-format.schema';
import { getValidator } from '../validate';

/**
 * The fixture table is the contract between the format check (generated JSON
 * Schema) and the canonical zod schema. zod strips unknown top-level keys by
 * design, so the zod verdict is stated per row, not derived.
 */
// [label, event, format verdict, zod verdict]
const fixtures: Array<[string, Record<string, unknown>, boolean, boolean]> = [
  [
    'custom user keys',
    { user: { id: 'u1', segment: 'vip', ltv: 5 } },
    true,
    true,
  ],
  ['optout', { user: { optout: true } }, true, true],
  [
    'ga4 source fields',
    { source: { type: 'ga4', pageLoadId: 'p1', hitSequence: 3 } },
    true,
    true,
  ],
  [
    'validate verdict on source',
    { source: { type: 'browser', valid: true } },
    true,
    true,
  ],
  ['wrong declared type', { user: { id: 5 } }, false, false],
  ['hashed value in email', { user: { email: 'a1b2c3' } }, false, false],
  ['unknown top-level key', { group: 'g1' }, false, true],
];

describe('format: true verdicts', () => {
  const validator = getValidator(eventFormatSchema);

  it.each(fixtures)('%s', (_label, event, formatValid, zodValid) => {
    expect(validator.validate(event).valid).toBe(formatValid);
    expect(schemas.PartialEventSchema.safeParse(event).success).toBe(zodValid);
  });
});
