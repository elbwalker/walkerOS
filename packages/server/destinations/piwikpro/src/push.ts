import type { Logger, WalkerOS } from '@walkeros/core';
import type { Hit, PushBatchFn, PushFn, Settings } from './types';
import { buildHits } from './hits';
import { sendHits } from './send';
import { logSkip } from './skip';

/** init returns validated settings; anything less means it did not run. */
function getSettings(
  settings: Partial<Settings> | undefined,
  logger: Logger.Instance,
): Settings {
  const { url, appId } = settings || {};
  if (!url || !appId) logger.throw('Config settings missing, init() not run');
  return { ...settings, url, appId };
}

function skip(
  logger: Logger.Instance,
  id: string,
  event: WalkerOS.Event,
  reason: string,
): void {
  logSkip(
    logger,
    `${id}|${event.name}|${reason}`,
    `Piwik PRO skipped an event: ${reason}`,
    { event: event.name, id: event.id },
  );
}

export const push: PushFn = async function (
  event,
  { config, rule, data, ingest, collector, env, logger, id },
) {
  const settings = getSettings(config.settings, logger);
  const result = await buildHits(
    { event, rule, data, ingest },
    settings,
    collector,
  );

  if ('skip' in result) return skip(logger, id, event, result.skip);

  await sendHits(result.hits, settings, env, logger);
};

export const pushBatch: PushBatchFn = async function (
  batch,
  { config, collector, env, logger, id },
) {
  const settings = getSettings(config.settings, logger);
  const results = await Promise.all(
    batch.entries.map(({ event, rule, data, ingest }) =>
      buildHits({ event, rule, data, ingest }, settings, collector),
    ),
  );

  // Skips are dropped and counted delivered: a retry cannot fix them
  const hits: Hit[] = [];
  results.forEach((result, index) => {
    if ('skip' in result)
      skip(logger, id, batch.entries[index].event, result.skip);
    else hits.push(...result.hits);
  });

  if (hits.length) await sendHits(hits, settings, env, logger);
};
