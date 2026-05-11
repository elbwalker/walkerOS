import { dispatchSimulate } from '../dispatch-simulate';

describe('dispatchSimulate', () => {
  it('returns kind=none for empty flags', () => {
    expect(dispatchSimulate([])).toEqual({
      kind: 'none',
      ids: [],
    });
  });

  it('throws on invalid format BEFORE producing any route', () => {
    expect(() => dispatchSimulate(['api'])).toThrow(/Invalid step format/);
  });

  it('returns destination kind with every id', () => {
    expect(dispatchSimulate(['destination.api', 'destination.meta'])).toEqual({
      kind: 'destination',
      ids: ['api', 'meta'],
    });
  });

  it('returns source kind with single id', () => {
    expect(dispatchSimulate(['source.browser'])).toEqual({
      kind: 'source',
      ids: ['browser'],
    });
  });

  it('throws on mixed-type flags', () => {
    expect(() =>
      dispatchSimulate(['destination.api', 'source.browser']),
    ).toThrow(/Cannot --simulate/);
  });
});
