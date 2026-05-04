import { writeFileSync, mkdtempSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { withFlowContext } from '../flow-context';
import { createCLILogger } from '../../../core/cli-logger.js';

/**
 * Reproduces the amplitude-style deadlock: a destination's startFlow
 * awaits a setTimeout that the async-drain interception captures and
 * never fires until post-fn flush. With `drainPump: true`, the pump
 * fires the captured timer immediately so startFlow resolves fast.
 *
 * Without the pump, this test would hang ~5s and time out under jest.
 * With the pump active, the captured 10s timer fires on the next tick.
 */
describe('JSDOM push: init that awaits a captured timer', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'walkeros-jsdom-init-await-'));
  });

  afterEach(() => {
    try {
      rmSync(dir, { recursive: true, force: true });
    } catch {
      // best-effort cleanup
    }
  });

  it('does NOT deadlock when startFlow awaits a setTimeout (drainPump: true)', async () => {
    const bundlePath = join(dir, 'bundle.mjs');
    writeFileSync(
      bundlePath,
      `
export function wireConfig() {
  return {};
}

export async function startFlow() {
  // Mirrors amplitude engagement plugin: a long setTimeout that the
  // async-drain interception captures. Without a drain pump alongside
  // fn(), this never fires (flush() only runs after fn() resolves)
  // and the test hangs.
  await new Promise((resolve) => {
    setTimeout(resolve, 10000);
  });
  return { booted: true };
}
`,
      'utf-8',
    );

    const logger = createCLILogger({ silent: true });
    let bootedAt = 0;

    const result = await withFlowContext(
      {
        esmPath: bundlePath,
        platform: 'web',
        logger,
        asyncDrain: { timeout: 5000 },
        drainPump: true,
      },
      async (mod) => {
        const flow = (await mod.startFlow({})) as { booted?: boolean };
        if (flow?.booted) bootedAt = Date.now();
        return { success: true, duration: 0 };
      },
    );

    expect(result.success).toBe(true);
    expect(bootedAt).toBeGreaterThan(0);
  }, 5000);
});
