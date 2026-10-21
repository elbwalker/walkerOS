import { StepError } from '@walkeros/core';
import type { Destination } from '@walkeros/core';
import { sendWeb } from '../../../sendWeb';

type Types = Destination.Types<{ url?: string }>;

function requireUrl(config: Destination.Config<Types>): string {
  const url = config.settings?.url;
  if (!url)
    throw new StepError('Config settings url missing', { code: 'config' });
  return url;
}

/** Sends every event with sendWeb's synchronous XHR (the http profile). */
export const xhrSender: Destination.Instance<Types> = {
  type: 'xhr-sender',
  config: {},
  init: ({ config }) => {
    requireUrl(config);
  },
  push: (event, { config, rule }) => {
    if (rule?.silent) return;
    sendWeb(requireUrl(config), JSON.stringify({ name: event.name }), {
      transport: 'xhr',
    });
  },
};
