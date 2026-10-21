import * as https from 'https';
import { StepError } from '@walkeros/core';
import type { Destination } from '@walkeros/core';

type Settings = { url?: string };
type Types = Destination.Types<Settings>;

function requireUrl(config: Destination.Config<Types>): string {
  const url = config.settings?.url;
  if (!url)
    throw new StepError('Config settings url missing', { code: 'config' });
  return url;
}

async function post(url: string, body: string): Promise<void> {
  const res = await fetch(url, { method: 'POST', body });
  if (!res.ok)
    throw new StepError(`HTTP ${res.status}`, {
      code: 'transport',
      status: res.status,
      body: await res.text(),
    });
}

/** Reports everything: passes every check of the http profile. */
export const good: Destination.Instance<Types> = {
  type: 'good',
  config: {},
  init: ({ config }) => {
    requireUrl(config);
  },
  push: async (event, { config, rule }) => {
    if (rule?.silent) return;
    await post(requireUrl(config), JSON.stringify({ name: event.name }));
  },
};

/** The challenge's lens-1 destination: sends identified events only, so a stripped event is lost (item 10). */
export const conditional: Destination.Instance<Types> = {
  ...good,
  type: 'conditional',
  push: async (event, { config, rule }) => {
    if (rule?.silent) return;
    if (event.user.id)
      await post(requireUrl(config), JSON.stringify({ name: event.name }));
  },
};

/** Floats its send: the push settles before the request does (items 2 and 3). */
export const floating: Destination.Instance<Types> = {
  ...good,
  type: 'floating',
  push: (event, { config, rule }) => {
    if (rule?.silent) return;
    post(requireUrl(config), JSON.stringify({ name: event.name })).catch(
      () => undefined,
    );
  },
};

/** Copies the vendor's response text into its error message (item 7). */
export const echoing: Destination.Instance<Types> = {
  ...good,
  type: 'echoing',
  push: async (event, { config, rule }) => {
    if (rule?.silent) return;
    const res = await fetch(requireUrl(config), {
      method: 'POST',
      body: JSON.stringify({ name: event.name }),
    });
    if (!res.ok)
      throw new StepError(`HTTP ${res.status}: ${await res.text()}`, {
        code: 'transport',
        status: res.status,
      });
  },
};

/** Bypasses the helpers and the global fetch: its request escapes the kit's boundary (item 1). */
export const rawHttps: Destination.Instance<Types> = {
  ...good,
  type: 'raw-https',
  push: async (event, { config, rule }) => {
    if (rule?.silent) return;
    const body = JSON.stringify({ name: event.name });
    await new Promise<void>((resolve, reject) => {
      const req = https.request(
        requireUrl(config),
        { method: 'POST' },
        (res) => {
          res.resume();
          res.on('end', () => resolve());
        },
      );
      req.on('error', (err) =>
        reject(new StepError(err.message, { code: 'transport' })),
      );
      req.end(body);
    });
  },
};

/** Sends each batch entry on its own and reports the entries that failed (item 9). */
export const batching: Destination.Instance<Types> = {
  ...good,
  type: 'batching',
  pushBatch: async (batch, { config }) => {
    const url = requireUrl(config);
    const failed: Destination.BatchFailure[] = [];
    for (const [index, entry] of batch.entries.entries())
      await post(url, JSON.stringify({ name: entry.event.name })).catch(
        (error: unknown) => failed.push({ index, error }),
      );
    if (failed.length) return { failed };
  },
};

/** Swallows a failed batch: every entry counts as delivered (item 9). */
export const swallowing: Destination.Instance<Types> = {
  ...good,
  type: 'swallowing',
  pushBatch: async (batch, { config }) => {
    const url = requireUrl(config);
    for (const entry of batch.entries)
      await post(url, JSON.stringify({ name: entry.event.name })).catch(
        () => undefined,
      );
  },
};

/** Logs its own ERROR line next to the collector's: two lines for one cause (item 2). */
export const loud: Destination.Instance<Types> = {
  ...good,
  type: 'loud',
  push: async (event, context) => {
    try {
      await good.push(event, context);
    } catch (error) {
      context.logger.error('Vendor request failed');
      throw error;
    }
  },
};

/** Batches by default (shared rule 7) and reports the failed entries. */
export const batchingByDefault: Destination.Instance<Types> = {
  ...batching,
  type: 'batching-by-default',
  config: { batch: { size: 15, wait: 10_000 } },
};

/** Batches by default and hides a failed entry (item 9). */
export const swallowingByDefault: Destination.Instance<Types> = {
  ...swallowing,
  type: 'swallowing-by-default',
  config: { batch: { size: 15, wait: 10_000 } },
};

/**
 * A silent group rule: no default call, a group call when the event names a
 * group (in data or custom), nothing at all without one (a declared skip).
 */
export const grouping: Destination.Instance<Types> = {
  ...good,
  type: 'grouping',
  push: async (event, context) => {
    if (!context.rule?.silent) return good.push(event, context);
    const group = event.data.group ?? event.custom.group;
    if (typeof group === 'string')
      await post(requireUrl(context.config), JSON.stringify({ group }));
  },
};
