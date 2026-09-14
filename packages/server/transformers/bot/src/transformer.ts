import type { Mapping, Transformer } from '@walkeros/core';
import { getMappingValue, setByPath } from '@walkeros/core';
import { isBotContext, type BotContext } from './detect/context';
import { computeScore, type SignalName, type Signals } from './detect/score';
import type { BotInput, BotOutput, BotSettings } from './types';

const DEFAULT_INPUT: Required<BotInput> = {
  userAgent: 'ingest.userAgent',
  ip: 'ingest.ip',
  acceptLanguage: 'ingest.acceptLanguage',
  acceptEncoding: 'ingest.acceptEncoding',
  secFetchSite: 'ingest.secFetchSite',
  secFetchMode: 'ingest.secFetchMode',
  secFetchDest: 'ingest.secFetchDest',
  secFetchUser: 'ingest.secFetchUser',
  secChUa: 'ingest.secChUa',
  secChUaMobile: 'ingest.secChUaMobile',
  secChUaPlatform: 'ingest.secChUaPlatform',
  accept: 'ingest.accept',
  contentType: 'ingest.contentType',
  referer: 'ingest.referer',
  signatureAgent: 'ingest.signatureAgent',
  method: 'ingest.method',
  ja4: 'ingest.ja4',
  headerNames: 'ingest.headerNames',
};

const DEFAULT_OUTPUT: Required<BotOutput> = {
  botScore: 'user.botScore',
  botCategory: 'user.botCategory',
  botProduct: 'user.botProduct',
  // Reasons are a pipeline diagnostic, so they stay off the analytics event.
  botReasons: 'ingest.bot.reasons',
};

/**
 * Mutating dot-path setter for ingest writes.
 *
 * We can't use @walkeros/core setByPath here: it clones-and-returns (immutable),
 * but ingest is the pipeline's mutable scratch context. We need in-place writes
 * so subsequent transformers in the chain see the values.
 */
function setNestedPath(
  obj: Record<string, unknown>,
  path: string,
  value: unknown,
): void {
  const keys = path.split('.');
  let cur: Record<string, unknown> = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i];
    const next = cur[k];
    if (typeof next !== 'object' || next === null) cur[k] = {};
    cur = cur[k] as Record<string, unknown>;
  }
  cur[keys[keys.length - 1]] = value;
}

export const transformerBot: Transformer.Init<
  Transformer.Types<BotSettings>
> = (context) => {
  const { config } = context;
  const settings: BotSettings = config.settings ?? {};
  const input: Required<BotInput> = {
    ...DEFAULT_INPUT,
    ...(settings.input ?? {}),
  };
  const output: BotOutput = {
    ...DEFAULT_OUTPUT,
    ...(settings.output ?? {}),
  };
  // Declaring a name in settings.input is the operator asserting the signal is
  // wired. Resolution still falls back to DEFAULT_INPUT; declaration is a
  // separate fact, and the only reliable one for an absence-based check.
  const declared = Object.keys(settings.input ?? {}) as SignalName[];

  return {
    // Init's input config type is Partial<Settings>; the instance config type
    // is Settings. Same cast pattern the fingerprint transformer uses.
    type: 'bot',
    config: config as Transformer.Config<Transformer.Types<BotSettings>>,

    async push(event, ctx) {
      const { ingest, collector } = ctx;
      const source = { event, ingest };

      const resolve = async (
        value: Mapping.Value,
      ): Promise<string | undefined> => {
        const resolved = await getMappingValue(source, value, { collector });
        return typeof resolved === 'string' && resolved !== ''
          ? resolved
          : undefined;
      };

      const signals: Signals = {
        userAgent: await resolve(input.userAgent),
        ip: await resolve(input.ip),
        acceptLanguage: await resolve(input.acceptLanguage),
        acceptEncoding: await resolve(input.acceptEncoding),
        secFetchSite: await resolve(input.secFetchSite),
        secFetchMode: await resolve(input.secFetchMode),
        secFetchDest: await resolve(input.secFetchDest),
        secFetchUser: await resolve(input.secFetchUser),
        secChUa: await resolve(input.secChUa),
        secChUaMobile: await resolve(input.secChUaMobile),
        secChUaPlatform: await resolve(input.secChUaPlatform),
        accept: await resolve(input.accept),
        contentType: await resolve(input.contentType),
        referer: await resolve(input.referer),
        signatureAgent: await resolve(input.signatureAgent),
        method: await resolve(input.method),
        ja4: await resolve(input.ja4),
        headerNames: await resolve(input.headerNames),
      };

      let context: BotContext | undefined;
      if (settings.context !== undefined) {
        if (isBotContext(settings.context)) {
          context = settings.context;
        } else {
          const resolved = await getMappingValue(source, settings.context, {
            collector,
          });
          context = isBotContext(resolved) ? resolved : 'auto';
        }
      }

      const score = computeScore(signals, {
        context,
        suspiciousAt: settings.suspiciousAt,
        declared,
      });

      let nextEvent = event;

      const writeOutput = (
        path: string | false | undefined,
        value: unknown,
      ) => {
        if (!path || value === undefined) return;
        if (path.startsWith('ingest.')) {
          const subPath = path.slice('ingest.'.length);
          if (!subPath) return;
          setNestedPath(ingest, subPath, value);
        } else {
          nextEvent = setByPath(nextEvent, path, value);
        }
      };

      writeOutput(output.botScore, score.botScore);
      writeOutput(output.botCategory, score.botCategory);
      writeOutput(output.botProduct, score.botProduct);
      writeOutput(output.botReasons, score.botReasons);

      return { event: nextEvent };
    },
  };
};
