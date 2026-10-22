import { StepError } from '@walkeros/core';
import type { Destination } from '@walkeros/core';

/** One of the two ids is required, as gtag requires one of its tools. */
type Settings = {
  ga4?: { measurementId?: string };
  ads?: { conversionId?: string };
};
type Types = Destination.Types<Settings>;

const URL = 'https://127.0.0.1:9/collect';

function idOf(settings: Settings | undefined): string | undefined {
  return settings?.ga4?.measurementId ?? settings?.ads?.conversionId;
}

function oneOfIds(message: string): Destination.Instance<Types> {
  return {
    type: 'one-of',
    config: {},
    init: ({ config }) => {
      if (!idOf(config.settings))
        throw new StepError(message, { code: 'config' });
    },
    push: async (event, { config, rule }) => {
      if (rule?.silent) return;
      const res = await fetch(URL, {
        method: 'POST',
        body: JSON.stringify({ id: idOf(config.settings), name: event.name }),
      });
      if (!res.ok)
        throw new StepError(`HTTP ${res.status}`, {
          code: 'transport',
          status: res.status,
        });
    },
  };
}

/** Names a key of every alternative when none is set. */
export const eitherId = oneOfIds(
  'Config settings ga4.measurementId or ads.conversionId missing',
);

/** Names the ga4 alternative only. */
export const ga4Only = oneOfIds('Config settings ga4.measurementId missing');
