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
  it('preserves remove as a string array', () => {
    expect(
      RuleSchema.parse({ remove: ['currency', 'data.tax'] }).remove,
    ).toEqual(['currency', 'data.tax']);
  });
  it('rejects remove that is not a string array', () => {
    expect(RuleSchema.safeParse({ remove: [1, 2] }).success).toBe(false);
  });
});
