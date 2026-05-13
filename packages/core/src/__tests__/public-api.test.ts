import * as core from '../index';
import * as collector from '@walkeros/collector';

describe('public API surface', () => {
  it('does not export legacy dispatch helpers from core', () => {
    const c = core as Record<string, unknown>;
    expect(c.compileNext).toBeUndefined();
    expect(c.resolveNext).toBeUndefined();
    expect(c.RouteSpec).toBeUndefined();
  });

  it('does not export walkChain from collector', () => {
    const c = collector as Record<string, unknown>;
    expect(c.walkChain).toBeUndefined();
    expect(c.extractTransformerNextMap).toBeUndefined();
  });

  it('exports getNextSteps from core', () => {
    expect(typeof (core as Record<string, unknown>).getNextSteps).toBe(
      'function',
    );
  });
});
