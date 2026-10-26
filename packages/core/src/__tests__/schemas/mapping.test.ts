import { BatchSchema } from '../../schemas/destination';
import { ResultSchema, RuleSchema } from '../../schemas/mapping';

// These descriptions render into the docs property tables and MCP package_get.
describe('RuleSchema descriptions', () => {
  const { batch, condition, extend } = RuleSchema.shape;

  it('condition: a false condition tries the next rule', () => {
    expect(condition.description).toMatch(/next rule/);
    expect(condition.description).not.toMatch(/process event/);
  });
  it('batch: the number form is current and needs pushBatch', () => {
    expect(batch.description).not.toMatch(/legacy/i);
    expect(batch.description).toMatch(/pushBatch/);
  });
  it('extend: names the only place that merges it', () => {
    expect(extend.description).toMatch(/@walkeros\/transformer-ga4/);
    expect(extend.description).not.toMatch(/today/);
  });
  it.each([
    ['Result mappingKey', ResultSchema.shape.mappingKey.description],
    ['Batch key', BatchSchema.shape.key.description],
  ])('%s: the example is a real mapping key', (_, description) => {
    expect(description).toMatch(/"product view"/);
  });
});

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
