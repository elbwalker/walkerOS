import { dispatchSimulate } from '../dispatch-simulate';

describe('dispatchSimulate', () => {
  it('returns route=none for empty flags', () => {
    expect(dispatchSimulate([])).toEqual({
      route: 'none',
      ids: [],
    });
  });

  it('throws on invalid format BEFORE producing any route', () => {
    expect(() => dispatchSimulate(['api'])).toThrow(/Invalid step format/);
  });

  it('returns destination route with every id', () => {
    expect(dispatchSimulate(['destination.api', 'destination.meta'])).toEqual({
      route: 'destination',
      ids: ['api', 'meta'],
    });
  });

  it('returns source route with single id', () => {
    expect(dispatchSimulate(['source.browser'])).toEqual({
      route: 'source',
      ids: ['browser'],
    });
  });

  it('throws on mixed-type flags', () => {
    expect(() =>
      dispatchSimulate(['destination.api', 'source.browser']),
    ).toThrow(/Cannot --simulate/);
  });
});
