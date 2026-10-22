import type { Ingest, Transformer } from '@walkeros/core';
import { StepError, reportCause, stepId } from '@walkeros/core';
import { parseRequest, splitBodyLines } from './parse';
import { mapHitToEvents } from './map';
import { defaultMapping } from './defaults';
import { mergeGa4Mapping } from './merge';
import type { GA4Request, GA4Settings } from './types';

/**
 * Read the raw GA4 HTTP request from `ctx.ingest`.
 *
 * Source wiring (e.g. an express source) is expected to populate
 * `ingest.url` (full request URL, query string included) and optionally
 * `ingest.body` (raw POST body as a string). `Ingest` is an open
 * `Record<string, unknown>` per `@walkeros/core`, so each field is
 * narrowed with a `typeof` guard instead of a cast.
 *
 * Returns `null` if `url` is missing or not a string: the caller fails the
 * event with `missing-input`.
 */
function readGA4Request(ingest: Ingest): GA4Request | null {
  const url = ingest.url;
  if (typeof url !== 'string') return null;
  const body = ingest.body;
  return {
    url,
    body: typeof body === 'string' ? body : undefined,
  };
}

export const transformerGa4: Transformer.Init<
  Transformer.Types<GA4Settings>
> = (context) => {
  const { config } = context;
  const settings = config.settings ?? {};
  const tidPattern = new RegExp(settings.tidPattern ?? '^G-');
  const maxEvents = settings.maxEvents ?? 100;
  const mapping = mergeGa4Mapping(defaultMapping, settings.mapping ?? {});

  return {
    type: 'ga4',
    config,
    async push(_event, ctx) {
      const { logger, collector, id } = ctx;

      // Without a request there is nothing to decode: a wiring mistake (the
      // source's config.ingest) that would drop all traffic, so it fails.
      const raw = readGA4Request(ctx.ingest);
      if (!raw)
        throw new StepError(
          'transformer-ga4: no GA4 request in ingest (ingest.url missing)',
          { code: 'missing-input' },
        );

      // Bound the fan-out before decoding: every event becomes a concurrent
      // push, and the source's batch cap does not apply to a raw text body.
      // The dropped request is a loss, so it is reported (ERROR, once per
      // cause and minute).
      if (raw.body) {
        const lineCount = splitBodyLines(raw.body).length;
        if (lineCount > maxEvents) {
          reportCause(
            collector,
            logger,
            { step: stepId('transformer', id), code: 'invalid' },
            `transformer-ga4: ${lineCount} events exceed maxEvents ${maxEvents}; request dropped`,
            { events: lineCount, maxEvents },
          );
          return false;
        }
      }

      try {
        const hit = parseRequest(raw);

        if (hit.hit.tid && !tidPattern.test(hit.hit.tid)) {
          logger.debug(
            `transformer-ga4: tid ${hit.hit.tid} dropped by tidPattern`,
          );
          return false;
        }

        const events = mapHitToEvents(hit, mapping);
        if (events.length === 0) {
          logger.debug(
            `transformer-ga4: no events mapped (tid=${hit.hit.tid ?? 'unknown'})`,
          );
          return false;
        }

        logger.debug(
          `transformer-ga4: decoded ${events.length} events from ${hit.hit.tid ?? 'unknown'}`,
        );

        if (events.length === 1) return { event: events[0] };
        return events.map((event) => ({ event }));
      } catch (err) {
        // The collector reports it; the message names no request content.
        throw new StepError(
          'transformer-ga4: the GA4 request could not be decoded',
          {
            code: 'transformer',
            cause: err,
          },
        );
      }
    },
  };
};
