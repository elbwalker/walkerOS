import type { Transformer } from '@walkeros/core';
import { getMappingValue, setByPath } from '@walkeros/core';
import { computeScore } from './detect/score';
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
};

const DEFAULT_OUTPUT: Required<BotOutput> = {
  botScore: 'user.botScore',
  agentScore: 'user.agentScore',
  agentProduct: '', // off by default
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

  return {
    // Init's input config type is Partial<Settings>; the instance config type
    // is Settings. Same cast pattern the fingerprint transformer uses.
    type: 'bot',
    config: config as Transformer.Config<Transformer.Types<BotSettings>>,

    async push(event, ctx) {
      const { ingest, collector } = ctx;
      const source = { event, ingest };

      // v1 only reads userAgent. Other input fields are reserved for v1.1
      // (header heuristics); resolved-but-unused here would be wasteful, so
      // they are intentionally not read yet.
      const uaValue = await getMappingValue(source, input.userAgent, {
        collector,
      });
      const ua = typeof uaValue === 'string' ? uaValue : '';
      const score = computeScore(ua);

      let nextEvent = event;

      const writeOutput = (path: string, value: unknown) => {
        if (!path || value === undefined) return;
        if (path.startsWith('ingest.')) {
          const subPath = path.slice('ingest.'.length);
          if (!subPath) return;
          setNestedPath(ingest, subPath, value);
        } else {
          nextEvent = setByPath(nextEvent, path, value);
        }
      };

      writeOutput(output.botScore ?? '', score.botScore);
      writeOutput(output.agentScore ?? '', score.agentScore);
      writeOutput(output.agentProduct ?? '', score.agentProduct);

      return { event: nextEvent };
    },
  };
};
