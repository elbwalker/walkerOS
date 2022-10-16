import { IElbwalker, WebDestination } from '@elbwalker/walker.js';

declare global {
  interface Window {
    // add types
  }
}

export namespace DestinationEventPipe {
  export interface Config extends WebDestination.Config {
    custom: {
      api?: string;
      projectId?: string;
      exclusionParameters?: ExclusionParameters;
    };
    mapping?: WebDestination.Mapping<EventConfig>;
  }

  export interface Function extends WebDestination.Function {
    config: Config;
  }

  export interface EventConfig extends WebDestination.EventConfig {
    // Custom destination event mapping properties
  }
}

type ExclusionParameters = string[];

// Globals
const w = window;
const defaultAPI = 'https://moin.p.elbwalkerapis.com/lama';

const destination: DestinationEventPipe.Function = {
  config: { custom: { projectId: '' } },

  init() {
    let config = this.config;

    // Require projectId
    if (!config.custom.projectId) return false;

    return true;
  },

  push(
    event: IElbwalker.Event,
    mapping: DestinationEventPipe.EventConfig = {},
  ) {
    const config = this.config;
    const href = excludeParameters(
      location.href,
      config.custom.exclusionParameters,
    );
    const referrer = excludeParameters(
      document.referrer,
      config.custom.exclusionParameters,
    );

    // Custom check for default the page view event with search parameter
    if (event.event === 'page view' && event.data && event.data.search) {
      const origin = location.origin;
      const search = excludeParameters(
        origin + event.data.search,
        config.custom.exclusionParameters,
      );
      event.data.search = search.substring(origin.length + 1);
    }

    const payload = {
      ...event,
      projectId: config.custom.projectId,
      source: {
        type: 'web',
        id: href,
        referrer,
        version: '3',
      },
    };

    const xhr = new XMLHttpRequest();
    xhr.open('POST', config.custom.api || defaultAPI, true);
    xhr.setRequestHeader('Content-type', 'text/plain; charset=utf-8');
    xhr.send(JSON.stringify(payload));
  },
};

function excludeParameters(
  href: string,
  exclusionParameters: ExclusionParameters = [],
): string {
  if (!exclusionParameters.length) return href;

  try {
    let url = new URL(href);
    const searchParams = url.searchParams;

    exclusionParameters.map((parameter) => {
      if (searchParams.has(parameter)) searchParams.set(parameter, 'xxx');
    });

    url.search = searchParams.toString();

    return url.toString();
  } catch (e) {
    return '';
  }
}

export default destination;
