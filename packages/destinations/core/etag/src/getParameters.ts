import type { WalkerOS } from '@elbwalker/types';
import type { Config, Context, Parameters } from './types';
import { getParameter } from './getParameter';
import { getPageViewEvent } from './getPageViewEvent';

export function getParameters(
  events: WalkerOS.Events,
  config: Config,
  context: Context,
): Parameters {
  const parameters: Parameters = [];

  events.forEach((event) => {
    // Increment event count (_s)
    config.count = (event.count || 1) + 1; // Always increment or start at least at 2

    // session_start
    if (event.event == (config.sessionStart || 'session start')) {
      const session: WalkerOS.SessionData = {
        isStart: false,
        storage: false,
        ...event.data,
      };
      context.session = session;

      config.count = 1; // session start is always the first
    }

    // page_view
    if (event.event == (config.pageView || 'page view')) {
      parameters.push(getParameter(getPageViewEvent(event), config, context));
    }

    // Current event
    parameters.push(getParameter(event, config, context));
  });

  return parameters;
}
