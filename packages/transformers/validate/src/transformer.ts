import type { Transformer } from '@walkeros/core';
import { setByPath } from '@walkeros/core';
import { validateEventAgainstContract } from './validate';
import type { ValidateSettings } from './types';

/**
 * Mutating dot-path setter for ingest writes.
 *
 * We can't use @walkeros/core setByPath here: it clones-and-returns (immutable),
 * but ingest is the pipeline's mutable scratch context. We need in-place writes
 * so subsequent transformers and observers in the chain see the values.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

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
    if (isRecord(next)) {
      cur = next;
    } else {
      const child: Record<string, unknown> = {};
      cur[k] = child;
      cur = child;
    }
  }
  cur[keys[keys.length - 1]] = value;
}

export const transformerValidate: Transformer.Init<
  Transformer.Types<ValidateSettings>
> = (context) => {
  const { config } = context;
  const settings: ValidateSettings = config.settings ?? {};

  const mode = settings.mode ?? 'pass';
  const isValidPath = settings.output?.isValid ?? 'source.valid';
  const errorsPath = settings.output?.errors ?? 'validation';

  return {
    // Init's input config type is Partial<Settings>; the instance config type
    // is Settings. Same cast pattern the bot/fingerprint transformers use.
    type: 'validate',
    config: config as Transformer.Config<Transformer.Types<ValidateSettings>>,

    async push(event, ctx) {
      const { ingest } = ctx;

      const { isValid, errors } = validateEventAgainstContract(event, ingest, {
        contracts: settings.contract,
        format: settings.format,
      });

      // Issues go to the INGEST (observer-visible diagnostics), written in
      // place so they survive even when a strict drop stops the chain.
      if (errorsPath) setNestedPath(ingest, errorsPath, errors);

      // Verdict goes to the EVENT (travels to destinations as analytics data).
      // setByPath is immutable, so reassign.
      let nextEvent = event;
      if (isValidPath) nextEvent = setByPath(nextEvent, isValidPath, isValid);

      // strict + invalid: chain-stop drop. Errors are already on the ingest,
      // so the drop is still diagnosable.
      if (mode === 'strict' && !isValid) return false;

      return { event: nextEvent };
    },
  };
};
