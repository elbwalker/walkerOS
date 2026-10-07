import { RuleSchema } from '../../schemas/mapping';
describe('RuleSchema extend/remove', () => {
  it('preserves extend with a nested partial rule', () => {
    expect(
      RuleSchema.parse({
        extend: { data: { map: { affiliation: 'params.ep.affiliation' } } },
      }).extend,
    ).toEqual({ data: { map: { affiliation: 'params.ep.affiliation' } } });
  });
  it('preserves a null value in extend (clear an inherited field)', () => {
    expect(RuleSchema.parse({ extend: { consent: null } }).extend).toEqual({
      consent: null,
    });
  });
  it('accepts a null at a nested key in extend (clear an inherited map key)', () => {
    const extend = {
      data: { map: { tax: null } },
      policy: { 'data.coupon': null },
      consent: { marketing: null },
    };
    expect(RuleSchema.parse({ extend }).extend).toEqual(extend);
  });
  it('rejects a null in a regular data.map', () => {
    expect(RuleSchema.safeParse({ data: { map: { tax: null } } }).success).toBe(
      false,
    );
  });
  it('preserves remove as a string array', () => {
    expect(
      RuleSchema.parse({ remove: ['currency', 'data.tax'] }).remove,
    ).toEqual(['currency', 'data.tax']);
  });
  it('rejects remove that is not a string array', () => {
    expect(RuleSchema.safeParse({ remove: [1, 2] }).success).toBe(false);
  });
});
