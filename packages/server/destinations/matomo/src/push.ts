import type { Destination as CoreDestination, WalkerOS } from '@walkeros/core';
import type { Credentials, PushFn, Settings, Types } from './types';
import type { BuildResult } from './hits';
import { reportCause, StepError, stepId } from '@walkeros/core';
import { checkSettings } from './config';
import { buildHits } from './hits';
import { sendHits } from './send';

type Built = Extract<BuildResult, { hits: unknown }>;

/** init returns checked settings, but config.init: true skips it, so they are checked here as well. */
function getSettings(config: {
  settings?: Partial<Settings>;
  credentials?: Credentials;
}): Settings {
  const settings = config.settings || {};
  checkSettings(settings, config.credentials);
  return settings;
}

/** An event the rule cannot turn into a request. */
function invalid(reason: string): StepError {
  return new StepError(`Matomo cannot send the event: ${reason}`, {
    code: 'missing-input',
  });
}

/**
 * Sends the built hits and names what Matomo will not see: values not sent,
 * a hit Matomo may merge into another visitor's visit, and an answer without
 * counts. The event is delivered in each of these cases.
 */
async function deliver(
  event: WalkerOS.Event,
  built: Built,
  { config, collector, env, logger, id }: CoreDestination.PushContext<Types>,
): Promise<{ tracked: number } | undefined> {
  const step = stepId('destination', id);

  if (built.dropped.length)
    reportCause(
      collector,
      logger,
      { step, code: 'not-sent' },
      'Matomo did not send some mapped values',
      { event: event.name, error: built.dropped.join(', ') },
    );
  if (!built.visitorSafe)
    reportCause(
      collector,
      logger,
      { step, code: 'visitor-merge' },
      'Matomo may merge visitors for this hit: set ip, credentials.token and userAgent, or send a visitor id without a user id',
      { event: event.name },
    );

  const sent = await sendHits(
    built.endpoint,
    built.hits,
    config.credentials?.token,
    env,
    config,
    logger,
  );
  if ('tracked' in sent) return { tracked: sent.tracked };

  reportCause(
    collector,
    logger,
    { step, code: 'unconfirmed' },
    'Matomo answered without tracking counts (QueuedTracking): refused requests cannot be reported',
    { event: event.name },
    'warn',
  );
  return undefined;
}

export const push: PushFn = async function (event, context) {
  const { config, rule, data, ingest, collector } = context;
  const settings = getSettings(config);
  const result = await buildHits(
    { event, rule, data, ingest },
    settings,
    collector,
  );

  if ('invalid' in result) throw invalid(result.invalid);

  // A skip is deliberate (a silent rule with no goal): no request.
  if ('hits' in result) return deliver(event, result, context);
};
