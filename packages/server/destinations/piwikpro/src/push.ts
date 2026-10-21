import type { Hit, PushBatchFn, PushFn, Settings } from './types';
import { StepError } from '@walkeros/core';
import { normalizeUrl } from './config';
import { buildHits } from './hits';
import { sendHits } from './send';

/**
 * init returns validated settings, but config.init: true skips it, so the url
 * is normalized here as well (idempotent).
 */
function getSettings(settings: Partial<Settings> | undefined): Settings {
  const { url, appId } = settings || {};
  if (!url || !appId)
    throw new StepError('Config settings missing, init() not run', {
      code: 'config',
    });
  return { ...settings, url: normalizeUrl(url), appId };
}

/** An event the rule cannot turn into a request. */
function invalid(reason: string): StepError {
  return new StepError(`Piwik PRO cannot send the event: ${reason}`, {
    code: 'missing-input',
  });
}

export const push: PushFn = async function (
  event,
  { config, rule, data, ingest, collector, env, logger },
) {
  const settings = getSettings(config.settings);
  const result = await buildHits(
    { event, rule, data, ingest },
    settings,
    collector,
  );

  if ('invalid' in result) throw invalid(result.invalid);

  // A skip is deliberate (no rule for the event, a silent rule): no request.
  if ('hits' in result) await sendHits(result.hits, settings, env, logger);
};

export const pushBatch: PushBatchFn = async function (
  batch,
  { config, collector, env, logger },
) {
  const settings = getSettings(config.settings);
  const results = await Promise.all(
    batch.entries.map(({ event, rule, data, ingest }) =>
      buildHits({ event, rule, data, ingest }, settings, collector),
    ),
  );

  // An event the rule cannot send fails on its own; the rest still goes out.
  const hits: Hit[] = [];
  const failed: Array<{ index: number; error: StepError }> = [];
  results.forEach((result, index) => {
    if ('invalid' in result)
      failed.push({ index, error: invalid(result.invalid) });
    else if ('hits' in result) hits.push(...result.hits);
  });

  if (hits.length) await sendHits(hits, settings, env, logger);

  return failed.length ? { failed } : undefined;
};
