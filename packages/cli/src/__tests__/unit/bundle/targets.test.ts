import {
  resolveTarget,
  BUNDLE_TARGETS,
} from '../../../commands/bundle/targets.js';

describe('BundleTarget presets', () => {
  it('cdn: production browser IIFE, no dev imports', () => {
    expect(resolveTarget('cdn')).toEqual({
      skipWrapper: false,
      withDev: false,
      platform: 'browser',
      injectEnv: true,
    });
  });

  it('cdn-skeleton: ESM skeleton for later IIFE wrap, no dev imports', () => {
    expect(resolveTarget('cdn-skeleton')).toEqual({
      skipWrapper: true,
      withDev: false,
      platform: 'browser',
      injectEnv: false, // injected during wrapSkeleton stage 2, not here
    });
  });

  it('runner: server skeleton for Scaleway function runtime, no dev imports', () => {
    expect(resolveTarget('runner')).toEqual({
      skipWrapper: true,
      withDev: false,
      platform: 'node',
      injectEnv: false,
    });
  });

  it('simulate: skeleton for in-process simulation, includes dev schemas', () => {
    expect(resolveTarget('simulate')).toEqual({
      skipWrapper: true,
      withDev: true,
      platform: 'node',
      injectEnv: false,
    });
  });

  it('push: skeleton for in-process push, includes dev schemas', () => {
    expect(resolveTarget('push')).toEqual({
      skipWrapper: true,
      withDev: true,
      platform: 'node',
      injectEnv: false,
    });
  });

  it('throws for unknown target', () => {
    // @ts-expect-error — intentional
    expect(() => resolveTarget('bogus')).toThrow(/unknown target/i);
  });

  it('BUNDLE_TARGETS is frozen (cannot be mutated)', () => {
    expect(() => {
      // @ts-expect-error — intentional
      BUNDLE_TARGETS.cdn.withDev = true;
    }).toThrow();
  });
});
