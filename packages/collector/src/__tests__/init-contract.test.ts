import { StepError } from '@walkeros/core';
import type { Destination } from '@walkeros/core';
import { startFlow } from '..';

describe('init contract', () => {
  it('a thrown StepError from init fails the push with its reason (B1, B2)', async () => {
    const dest: Destination.Instance = {
      type: 'needs-key',
      config: {},
      init: () => {
        throw new StepError('Config settings apiKey missing', {
          code: 'config',
        });
      },
      push: jest.fn(),
    };
    const { elb, collector } = await startFlow({
      destinations: { d: { code: dest } },
    });
    const r = await elb('page view');
    expect(r.ok).toBe(false);
    expect(r.queued).toBeUndefined();
    expect(r.failed?.d.reason?.code).toBe('config');
    expect(collector.status.destinations.d.failed).toBe(1);
  });

  it('a false returned at runtime (untyped bundle code) is reported as not-ready (guard)', async () => {
    const initFalse = (): false => false;
    const legacy: Destination.Instance = {
      type: 'legacy',
      config: {},
      init: initFalse,
      push: jest.fn(),
    };
    const { elb, collector } = await startFlow({
      destinations: { l: { code: legacy } },
    });
    const r = await elb('page view');
    expect(r.ok).toBe(false);
    expect(r.failed?.l.reason?.code).toBe('not-ready');
    expect(collector.status.destinations.l.failed).toBe(1);
  });
});
