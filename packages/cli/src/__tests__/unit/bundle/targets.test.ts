import {
  resolveTarget,
  BUNDLE_TARGETS,
} from '../../../commands/bundle/targets.js';

describe('BundleTarget presets', () => {
  it('cdn: production browser IIFE, no dev imports', () => {
    expect(resolveTarget('cdn')).toEqual({
      skipWrapper: false,
      withDev: false,
      externalizeDev: false,
      platform: 'browser',
      injectEnv: true,
    });
  });

  it('cdn-skeleton: ESM skeleton for later IIFE wrap, carries lazy dev registry', () => {
    expect(resolveTarget('cdn-skeleton')).toEqual({
      skipWrapper: true,
      withDev: true,
      externalizeDev: true,
      platform: 'browser',
      injectEnv: false, // injected during wrapSkeleton stage 2, not here
    });
  });

  it('runner: server skeleton for Scaleway function runtime, carries lazy dev registry', () => {
    expect(resolveTarget('runner')).toEqual({
      skipWrapper: true,
      withDev: true,
      externalizeDev: true,
      platform: 'node',
      injectEnv: false,
    });
  });

  it('simulate: skeleton for in-process simulation, includes dev schemas', () => {
    expect(resolveTarget('simulate')).toEqual({
      skipWrapper: true,
      withDev: true,
      externalizeDev: false,
      platform: 'node',
      injectEnv: false,
    });
  });

  it('push: skeleton for in-process push, includes dev schemas', () => {
    expect(resolveTarget('push')).toEqual({
      skipWrapper: true,
      withDev: true,
      externalizeDev: false,
      platform: 'node',
      injectEnv: false,
    });
  });

  it('externalizeDev: true for deploy skeletons, false for in-process and cdn', () => {
    expect(resolveTarget('cdn-skeleton').externalizeDev).toBe(true);
    expect(resolveTarget('runner').externalizeDev).toBe(true);
    expect(resolveTarget('simulate').externalizeDev).toBe(false);
    expect(resolveTarget('push').externalizeDev).toBe(false);
    expect(resolveTarget('cdn').externalizeDev).toBe(false);
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
