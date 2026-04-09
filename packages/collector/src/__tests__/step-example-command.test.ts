import type { Flow, WalkerOS } from '@walkeros/core';
import { startFlow } from '../flow';

/**
 * Verifies that the `command` field on Flow.StepExample is a well-typed
 * union and that the agreed-upon commands map 1:1 onto walker command
 * invocations the collector accepts.
 *
 * This is a type-level + smoke test, not a runner test. Runner behavior
 * lives per-package (see gtag stepExamples.test.ts).
 */
describe('StepExample.command', () => {
  it('accepts each documented command value without type errors', () => {
    const cases: Flow.StepExample[] = [
      { command: 'config', in: {}, out: {} },
      { command: 'consent', in: { marketing: true }, out: {} },
      { command: 'user', in: { id: 'u1' }, out: {} },
      { command: 'run', in: {}, out: {} },
      { in: { name: 'page view' }, out: {} }, // no command: default event path
    ];
    expect(cases).toHaveLength(5);
  });

  it('routes walker consent through the collector end-to-end', async () => {
    const { elb, collector } = await startFlow();
    await elb('walker consent', { marketing: true } as WalkerOS.Consent);
    expect(collector.consent).toEqual(
      expect.objectContaining({ marketing: true }),
    );
  });

  it('routes walker user through the collector end-to-end', async () => {
    const { elb, collector } = await startFlow();
    await elb('walker user', { id: 'u-42' } as WalkerOS.User);
    expect(collector.user?.id).toBe('u-42');
  });
});
