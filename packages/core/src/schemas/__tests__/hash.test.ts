import { createHashSettingsSchema } from '../hash';

describe('createHashSettingsSchema', () => {
  const schema = createHashSettingsSchema(['em', 'ph']);

  it.each<[string, unknown, boolean]>([
    ['accepts no doNotHash', {}, true],
    ['accepts hashed keys', { doNotHash: ['em', 'ph'] }, true],
    ['refuses a key it does not hash', { doNotHash: ['email'] }, false],
    ['refuses a string instead of a list', { doNotHash: 'em' }, false],
  ])('%s', (_, settings, valid) => {
    expect(schema.safeParse(settings).success).toBe(valid);
  });
});
