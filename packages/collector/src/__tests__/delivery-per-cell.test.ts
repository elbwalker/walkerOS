import type { On } from '@walkeros/core';
import { startFlow } from '../flow';

/**
 * The per-subscriber delivery high-water mark must be tracked per state CELL,
 * not as one scalar per subscriber. A single `source.on` handler that reacts to
 * two different cells, both owed at the run barrier (bumped while `!allowed`),
 * must receive BOTH — a single scalar mark advances on the first delivery and
 * swallows the second cell's edge even though it is a different cell.
 */
describe('per-cell delivery marks', () => {
  test('two cells owed at the run barrier both deliver to one handler', async () => {
    const received: string[] = [];
    const { collector } = await startFlow({
      run: false,
      sources: {
        s: {
          code: async (ctx: any) => ({
            type: 's',
            config: {},
            push: ctx.env.elb,
            on: (type: On.Types) => {
              received.push(String(type));
            },
          }),
        },
      },
    });

    // Pre-run: two distinct cells bumped while !allowed. The source is started
    // (no require), but state deliveries defer until run.
    await collector.command('consent', { marketing: true });
    await collector.command('user', { id: 'u1' });
    expect(received).toEqual([]);

    await collector.command('run');

    // Both owed cells must be delivered at the barrier, not only the first.
    expect(received).toContain('consent');
    expect(received).toContain('user');
  });

  test('exactly-once per cell across re-run (no double, no cross-cell skip)', async () => {
    const received: string[] = [];
    const { collector } = await startFlow({
      run: true,
      sources: {
        s: {
          code: async (ctx: any) => ({
            type: 's',
            config: {},
            push: ctx.env.elb,
            on: (type: On.Types) => {
              received.push(String(type));
            },
          }),
        },
      },
    });

    await collector.command('consent', { marketing: true });
    await collector.command('user', { id: 'u1' });
    // One delivery per distinct cell change.
    expect(received.filter((t) => t === 'consent')).toHaveLength(1);
    expect(received.filter((t) => t === 'user')).toHaveLength(1);

    // A second run must not re-fire already-delivered state cells (the `run`
    // lifecycle broadcast itself is not a state delivery, so exclude it).
    const stateBefore = received.filter(
      (t) => t === 'consent' || t === 'user',
    ).length;
    await collector.command('run');
    const stateAfter = received.filter(
      (t) => t === 'consent' || t === 'user',
    ).length;
    expect(stateAfter).toBe(stateBefore);
  });
});
