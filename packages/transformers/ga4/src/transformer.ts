import type { Ingest, Transformer } from '@walkeros/core';
import { parseRequest } from './parse';
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
 * Returns `null` if `url` is missing or not a string — the caller drops
 * the event in that case.
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
  const mapping = mergeGa4Mapping(defaultMapping, settings.mapping ?? {});

  return {
    type: 'ga4',
    config,
    async push(_event, ctx) {
      const { logger } = ctx;

      const raw = readGA4Request(ctx.ingest);
      if (!raw) {
        logger.debug('transformer-ga4: no request in ingest; skipping');
        return false;
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
        const message = err instanceof Error ? err.message : String(err);
        logger.error(`transformer-ga4: parse error: ${message}`);
        return false;
      }
    },
  };
};
