import { allowedRefKinds } from '../allowed-ref-kinds';

describe('allowedRefKinds', () => {
  it('offers var/env/secret broadly', () => {
    expect(allowedRefKinds('destination', ['config'])).toEqual(
      expect.arrayContaining(['var', 'env', 'secret']),
    );
  });

  it('offers store only under env', () => {
    expect(allowedRefKinds('destination', ['config', 'env'])).toContain(
      'store',
    );
    expect(
      allowedRefKinds('destination', ['config', 'settings']),
    ).not.toContain('store');
  });

  it('offers flow only in settings/env of source/destination', () => {
    expect(allowedRefKinds('destination', ['config', 'settings'])).toContain(
      'flow',
    );
    expect(
      allowedRefKinds('transformer', ['config', 'settings']),
    ).not.toContain('flow');
  });

  it('offers contract only at a validate-events value', () => {
    expect(
      allowedRefKinds('destination', ['validate', 'events', 'product', 'view']),
    ).toContain('contract');
    expect(allowedRefKinds('destination', ['config'])).not.toContain(
      'contract',
    );
  });
});
