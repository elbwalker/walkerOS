import type { Transformer } from '../types';

describe('Transformer.Config mapping field', () => {
  it('accepts mapping: Mapping.Config at the transformer position', () => {
    const t: Transformer.InitTransformer = {
      mapping: {},
    };
    expect(t).toBeDefined();
  });

  it('accepts a Mapping.Config-shaped value with policy', () => {
    const t: Transformer.InitTransformer = {
      mapping: { policy: { user_id: { value: 'redacted' } } },
    };
    expect(t).toBeDefined();
  });
});
