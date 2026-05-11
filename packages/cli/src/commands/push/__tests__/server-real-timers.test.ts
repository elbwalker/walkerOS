import { writeFileSync, mkdtempSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { withFlowContext } from '../flow-context';
import { createCLILogger } from '../../../core/cli-logger.js';

/**
 * Bug D1 regression: server real push must run with native Node timers.
 *
 * gRPC SDKs (Pub/Sub, BigQuery, Kafka, AWS SDK v3, etc.) drive batch
 * flush via setTimeout and keepalive via setInterval internally.
 * `installTimerInterception` patches these globally; the gRPC client's
 * state machine then never advances and `topic.publishMessage()` never
 * resolves. The CLI fix in `executeDestinationPush` simply omits
 * `asyncDrain` and `drainPump` when `platform === 'server'`. This test
 * locks that contract by asserting that, without those options,
 * `withFlowContext` does not patch `setTimeout` and a bundle that
 * `await`s a setTimeout finishes via the real timer.
 */
describe('server real push: native timers (Bug D1)', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'walkeros-server-real-timers-'));
  });

  afterEach(() => {
    try {
      rmSync(dir, { recursive: true, force: true });
    } catch {
      // best-effort cleanup
    }
  });

  it('does NOT intercept setTimeout when asyncDrain is omitted', async () => {
    const bundlePath = join(dir, 'bundle.mjs');
    writeFileSync(
      bundlePath,
      `
export function wireConfig() {
  return {};
}

export async function startFlow() {
  // Capture which setTimeout the bundle sees. If interception were
  // active this reference would be the patched version installed by
  // installTimerInterception. With no asyncDrain option, it must be
  // Node's native setTimeout.
  globalThis.__capturedSetTimeoutRef = setTimeout;

  // A short native timer that should fire on its own (no flush needed).
  await new Promise((resolve) => setTimeout(resolve, 30));
  return { booted: true };
}
`,
      'utf-8',
    );

    const logger = createCLILogger({ silent: true });
    const start = Date.now();
    const nativeSetTimeout = setTimeout;

    const result = await withFlowContext(
      {
        esmPath: bundlePath,
        platform: 'server',
        logger,
        // Intentionally omitting asyncDrain + drainPump — this is what
        // the server path of executeDestinationPush does after Bug D1.
      },
      async (mod) => {
        const flow = (await mod.startFlow({})) as { booted?: boolean };
        return { success: !!flow?.booted, duration: 0 };
      },
    );
    const elapsed = Date.now() - start;

    // The bundle resolved its own timer; this means we ran on real timers.
    expect(result.success).toBe(true);

    // The setTimeout the bundle saw is the genuine Node setTimeout, not
    // the tracked replacement installed by installTimerInterception.
    const captured = (
      globalThis as unknown as { __capturedSetTimeoutRef?: typeof setTimeout }
    ).__capturedSetTimeoutRef;
    expect(captured).toBe(nativeSetTimeout);

    // Should take at least the requested 30ms — proves we didn't fast-forward
    // through interception. No upper bound: CI machines vary.
    expect(elapsed).toBeGreaterThanOrEqual(25);
  });
});
