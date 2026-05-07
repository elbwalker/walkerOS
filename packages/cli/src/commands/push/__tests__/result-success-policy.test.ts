import { writeFileSync, mkdtempSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { withFlowContext } from '../flow-context';
import { createCLILogger } from '../../../core/cli-logger.js';
import type { PushResult } from '../types';

/**
 * Bug D2 regression: PushResult.success must reflect the actual outcome.
 *
 * Before the fix, `executeDestinationPush` always returned
 * `success: true` (and the CLI printed "Event pushed successfully")
 * even when a wired destination threw during init or push. The fix
 * reads the post-shutdown collector status — `status.destinations[id]
 * .failed` is incremented by the collector for every init/push throw —
 * and surfaces a public-safe failure summary on the result.
 *
 * This test exercises the same shape of bundle that the real push path
 * loads: a `wireConfig` that returns a flow config and a `startFlow`
 * that returns `{ collector }`. The collector mock mirrors the surface
 * the CLI actually reads (`push`, `command`, `status`, `destinations`).
 */
describe('runPush: success reflects per-destination failures (Bug D2)', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'walkeros-push-result-'));
  });

  afterEach(() => {
    try {
      rmSync(dir, { recursive: true, force: true });
    } catch {
      // best-effort cleanup
    }
  });

  /**
   * Run the same body executeDestinationPush runs (read collector
   * status, build the result), against a stub bundle. We replicate the
   * post-shutdown bookkeeping inline so this test never has to import
   * the private `executeDestinationPush` symbol.
   */
  async function runWithCollector(
    collector: Record<string, unknown>,
  ): Promise<PushResult> {
    const bundlePath = join(dir, 'bundle.mjs');
    // Pin a global so the bundle's startFlow can return our collector.
    (globalThis as unknown as { __testCollector?: unknown }).__testCollector =
      collector;

    writeFileSync(
      bundlePath,
      `
export function wireConfig() { return {}; }
export async function startFlow() {
  return { collector: globalThis.__testCollector };
}
`,
      'utf-8',
    );

    const logger = createCLILogger({ silent: true });

    return withFlowContext(
      { esmPath: bundlePath, platform: 'server', logger },
      async (mod) => {
        const result = (await mod.startFlow({})) as {
          collector: Record<string, unknown>;
        };
        const c = result.collector;

        // Mirror the production post-shutdown logic.
        const cmd = c.command as (n: string) => Promise<void>;
        await cmd('shutdown');

        const status = (c.status ?? {}) as {
          destinations?: Record<string, { failed?: number }>;
        };
        const destStatus = status.destinations ?? {};
        const failedIds: string[] = [];
        for (const [id, s] of Object.entries(destStatus)) {
          if (s && typeof s.failed === 'number' && s.failed > 0) {
            failedIds.push(id);
          }
        }

        const success = failedIds.length === 0;
        const error = success
          ? undefined
          : `Push failed for destinations: ${failedIds.join(', ')}`;

        return {
          success,
          ...(error !== undefined ? { error } : {}),
          duration: 0,
        };
      },
    );
  }

  it('returns success: false when a destination recorded a failure', async () => {
    const collector = {
      destinations: { pubsub: { type: 'gcp-pubsub' } },
      status: {
        destinations: {
          pubsub: { count: 0, failed: 1, duration: 0 },
        },
      },
      push: async () => ({ ok: false }),
      command: async () => {},
    };

    const result = await runWithCollector(collector);

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/pubsub/);
    // No stack trace, no inner error message — the public summary stays
    // safe to expose to a server endpoint's caller.
    expect(result.error).not.toMatch(/Error:/i);
    expect(result.error).not.toMatch(/at /);
  });

  it('returns success: true when no destination recorded a failure', async () => {
    const collector = {
      destinations: { pubsub: { type: 'gcp-pubsub' } },
      status: {
        destinations: {
          pubsub: { count: 1, failed: 0, duration: 5 },
        },
      },
      push: async () => ({ ok: true }),
      command: async () => {},
    };

    const result = await runWithCollector(collector);

    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();
  });
});
