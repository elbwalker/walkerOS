import { UserSchema, SourceSchema, userJsonSchema } from '../walkeros';

describe('open-record event branches', () => {
  it('keeps custom user keys, including undefined values', () => {
    const parsed = UserSchema.parse({
      id: 'u1',
      segment: 'vip',
      ltv: 5,
      gone: undefined,
    });
    expect(parsed).toMatchObject({ id: 'u1', segment: 'vip', ltv: 5 });
  });

  it('keeps source fields a step adds', () => {
    const parsed = SourceSchema.parse({
      type: 'ga4',
      pageLoadId: 'p1',
      hitSequence: 3,
      valid: true,
    });
    expect(parsed).toMatchObject({
      pageLoadId: 'p1',
      hitSequence: 3,
      valid: true,
    });
  });

  it('types optout and still rejects wrong declared types', () => {
    expect(UserSchema.safeParse({ optout: true }).success).toBe(true);
    expect(UserSchema.safeParse({ optout: 'yes' }).success).toBe(false);
    expect(UserSchema.safeParse({ id: 5 }).success).toBe(false);
    expect(UserSchema.safeParse({ email: 'a1b2c3' }).success).toBe(false);
  });

  it('emits an open index for user in JSON Schema', () => {
    expect(JSON.stringify(userJsonSchema)).not.toContain(
      '"additionalProperties":false',
    );
  });
});
