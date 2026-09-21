import type { Transformer } from '@walkeros/core';
import { setByPath } from '@walkeros/core';
import { validateEventAgainstContract } from './validate';
import type { ValidateSettings } from './types';

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

      const { isValid, errors, engineError } = validateEventAgainstContract(
        event,
        ingest,
        { contracts: settings.contract, format: settings.format },
      );
      if (engineError)
        ctx.logger.error('validation engine failed', {
          event: event.name,
          error: engineError,
        });

      // Issues go to the INGEST (observer-visible diagnostics), written in
      // place so they survive even when a strict drop stops the chain.
      if (errorsPath) setByPath(ingest, errorsPath, errors, { mutable: true });

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
